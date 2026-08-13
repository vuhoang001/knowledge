---
title: Interpreter
sidebar_position: 15
description: "A small language becomes a self-evaluating object tree — the same tree can also generate SQL, and that's the real reason to use it."
tags: [interpreter, behavioral, gof, expression-tree, dsl]
domain: backend
category: pattern
doc_type: skill
status: draft
difficulty: advanced
verified_at:
updated: 2026-08-04
---

# Interpreter

> **Takeaway:** Interpreter is the **least used** GoF pattern, and nearly always in the wrong place when
> it is used — except in one case: when you need **one expression to produce several outputs**.
> Below, the same filter tree both evaluates in memory and generates a SQL `WHERE`.

## Goal

Let a user (or a configuration file) express a rule the programmer didn't know in advance — a filter, a
calculation formula, an alert condition — and turn that rule into something runnable.

## The original intent (GoF)

Given a language, define a representation for its grammar along with an interpreter that uses that
representation to interpret sentences in the language.

The structure is always a [Composite](composite.md) tree: leaf nodes are *terminal expressions* (constants,
column names), branch nodes are *non-terminal expressions* (`VA`, `HOAC`, `KHONG`).

```csharp
interface IBieuThuc { bool Danh(Don d); string MoTa(); string SangSql(); }

sealed class Va(IBieuThuc t, IBieuThuc p) : IBieuThuc
{
    public bool Danh(Don d) => t.Danh(d) && p.Danh(d);
    ...
}
```

## Worked example — a configurable order filter

Run with `dotnet run 20-interpreter.cs` on .NET 11.0.0.

The expression: `(region = "Ha Noi" OR amount > 2,000,000) AND is_paid`

```csharp
IBieuThuc loc = new Va(
    new Hoac(new BangChuoi(d => d.KhuVuc, "Ha Noi"), new LonHon(d => d.Tien, 2_000_000m)),
    new La(d => d.DaThanhToan));
```

```text
Bieu thuc: ((khu_vuc = "Ha Noi" HOAC tien > 2,000,000) VA da_thanh_toan)

ma    khu vuc           tien   da tt   khop?
------------------------------------------------
DH01  Ha Noi       1,200,000    True   CO
DH02  Da Nang        300,000   False   khong
DH03  Ha Noi         250,000   False   khong
DH04  TP HCM       5,000,000    True   CO
```

### Adding a new operator — one class

```csharp
sealed class Khong(IBieuThuc t) : IBieuThuc
{
    public bool Danh(Don d) => !t.Danh(d);
    public string MoTa() => $"KHONG {t.MoTa()}";
    public string SangSql() => $"NOT ({t.SangSql()})";
}
```

```text
=== Them toan tu moi: KHONG ===
Bieu thuc: KHONG khu_vuc = "Ha Noi"
  DH01 -> khong
  DH02 -> CO
  DH03 -> khong
  DH04 -> CO
```

### The real reason to use it — one tree, several outputs

```text
=== Cung cay do, sinh ra SQL thay vi danh gia ===
  WHERE ((khu_vuc = 'Ha Noi' OR tien > 2000000) AND da_thanh_toan = TRUE)
```

**This is where Interpreter earns its cost.** The same user-configured expression can:

- evaluate in memory for data already loaded,
- be pushed down to the database as a `WHERE` for data not yet loaded,
- be displayed back to the user in their own language,
- and (if needed) generate an expression for a search engine.

Four outputs from **one** structure. There's no way to do that with a `Func<Don, bool>` —
a delegate is runnable but not **readable**, so it can't be translated to SQL.

### Compared with LINQ, which already exists

```text
=== So sanh voi LINQ co san ===
  LINQ      : [DH01, DH04]
  Interpreter: [DH01, DH04]
  Khop: True
```

Identical results. So the right question is: *then why not just use LINQ?*

| | `Func<Don, bool>` (LINQ to Objects) | `Expression<Func<Don, bool>>` | A hand-written Interpreter |
|---|---|---|---|
| Evaluate in memory | yes | yes (after `Compile()`) | yes |
| Translate to SQL | **no** | yes (EF Core does this) | yes, written by you |
| Build from a user-entered string | no | hard | **yes** |
| Display back to the user | no | hard to read | yes |
| Business-specific operators | no | no | yes |
| Effort | 0 | low | **high** |

**If the expression is written by a programmer, use `Expression<T>` — .NET already has an expression tree
and EF Core already knows how to translate it.** A hand-written Interpreter only wins on the two bold
rows: when the expression comes from a **user** at run time, and when you need **your own business
operators** (`in_promotion_period`, `belongs_to_customer_group`).

## When NOT to use it

| Situation | What to do instead |
|---|---|
| A complex grammar (operator precedence, functions, variables) | Use a parser generator (ANTLR) or an existing expression library |
| You only need in-memory evaluation | `Func<T, bool>` |
| The expression is written by a programmer | `Expression<Func<T, bool>>` |
| There are only 3–4 fixed rules | A lookup table `Dictionary<string, Func<...>>` |
| You need high performance in a hot loop | An object tree is many times slower than compiled code |

The first row is why Interpreter is rare: real grammars are seldom as simple as the textbook example, and
as soon as there's operator precedence, hand-writing a parser is easy to get wrong.

## Trade-offs

| You gain | You lose |
|---|---|
| One structure, several outputs (evaluation, SQL, display) | Each operator is a class — a 20-rule grammar is 20 classes |
| The rules become **data**, editable without rebuilding | You have to write a parser too if the input is a string |
| End users can configure it | A user-submitted expression is an attack surface (depth, complexity) |
| Adding an operator doesn't touch the existing operators | Adding a new **operation** (say `SangJson`) means editing every class — unless you use [Visitor](visitor.md) |

That last row is the most important relationship: **Interpreter plus Visitor** solves both directions of
extension. C#'s own expression tree (`System.Linq.Expressions`) does exactly that —
`ExpressionVisitor` is a public base class.

## Common Mistakes

| Mistake | Consequence |
|---|---|
| Stuffing the parser into the expression classes | Two jobs mixed; the parser should be separate and only produce the tree |
| Not bounding the tree depth from user input | `StackOverflowException` — a DoS vector |
| Concatenating SQL strings directly from user values | SQL injection; you must generate **parameters**, not values |
| Adding a new method to `IBieuThuc` every time you need a new output | You edit every class; use [Visitor](visitor.md) |
| Using Interpreter for a programmer-written expression | `Expression<T>` already exists and EF Core already translates it |
| Re-evaluating the tree in a hot loop | Slow; consider compiling the tree into a delegate once |

The third row is notable in this very example: `SangSql()` concatenates `'{giaTri}'` into a string.
With user data that's a vulnerability — a usable version has to return `(sql, parameters[])`.

## FAQ

<details>
<summary>Can I compile the tree into a delegate to run faster?</summary>

You can, and that's the most pragmatic route when you need both configurability and speed:

```csharp
Func<Don, bool> daBienDich = d => loc.Danh(d);   // van la cay
// hoac: dung LINQ Expression de sinh IL that su
```

The stronger approach is building an `Expression` tree and calling `.Compile()` — then you get JIT-generated
machine code. In exchange: the tree-building code is far harder to read, and it's unfriendly to AOT.

</details>

<details>
<summary>Is there a .NET library that already does this?</summary>

There are a few common directions, depending on the need:

- **LINQ expression trees** (`System.Linq.Expressions`) — built into the BCL, translatable by EF Core.
- **Dynamic LINQ** — takes a string like `"KhuVuc == \"Ha Noi\""` and builds an expression.
- **A rules engine** — when the rules are something the business manages, not something technical.

Hand-writing an Interpreter is only worth it when the grammar is **your business's own** and small. That's a
narrow condition, and it's why this pattern is rarely seen.

</details>

<details>
<summary>How do I block a malicious expression from a user?</summary>

Three layers of protection, and you need all three:

1. **Bound the depth and node count** while parsing — blocking a tree that would overflow the stack.
2. **Whitelist the operators and columns** — a user must not be able to mention a column they have no
   permission for.
3. **Generate parameterised SQL**, not concatenated strings — blocking injection.

The second layer is easily forgotten and is a genuine authorization hole: a filter `salary > 0` on the HR
table leaks information even though the user isn't allowed to view the salary column.

</details>

## Related Topics

- [Composite](composite.md) — Interpreter is a Composite carrying semantics
- [Visitor](visitor.md) — how to add new operations over the tree without editing the node classes
- [Iterator](iterator.md) — traversing an expression tree
- [Strategy](strategy.md) — when the rule only needs choosing from an existing list
- [Which pattern to choose](../reference/choosing-a-pattern.md) — the symptom lookup table

## References

- GoF — *Design Patterns*, Interpreter
- Microsoft — *Expression Trees* (C# programming guide)

# Specs

One file per feature, written after the grill and before the code (`to-spec` writes these). Name:
`YYYY-MM-DD-short-name.md`. Keep it under a page:

1. **Ask**: Flah's words, quoted.
2. **Decisions**: what was picked in the grill (and what was not).
3. **Done means**: what a person can do, on which screens, with the numbers it must hit (latency, sizes, counts).
4. **Proof**: the suite(s) that check it, and the sabotages each must catch.
5. **Changes old behaviour**: which existing suites assert the old way and will be updated in the same pass.
6. **Tickets**: the slices, in order, each one buildable and checkable on its own.
7. **Not checked by a machine**: what Flah has to look at or listen to.

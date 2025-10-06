# OPER-8 Feature Ideas

Here is a loose collection of ideas under consideration.

## Convenience Opcodes

- `CMPI Rx, iii` -- compare register to 4-bit constant
- `TESTI Rx, iii` -- test register against 4-bit constant
- `CMPIS Rx, iii` -- compare register to sign-extended 4-bit constant
- `TESTIS Rx, iii` -- test register against sign-extended 4-bit constant
- `PRINT Rx` -- outputs ASCII code in Rx to stdout
- `INPUT Rx` -- inputs ASCII(?) code from stdin to Rx, and sets Z, N flags; never blocks, but returns 00 if no input is currently available

Note that the PRINT and INPUT opcodes would replace the current memory-mapped I/O for the same purpose.


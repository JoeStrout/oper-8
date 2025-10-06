# OPER-8 Interactive Mode Guide

Interactive mode provides a REPL (Read-Eval-Print Loop) environment for experimenting with the OPER-8 CPU, testing assembly code, and debugging programs.

## Starting Interactive Mode

```bash
node dist/cli.js -i
```

Or during development:
```bash
npm run dev -- -i
```

## Command Overview

Interactive mode supports several types of commands:

1. **Direct commands** - Standard REPL commands like `help`, `regs`, `mem`, etc.
2. **Immediate execution (`!`)** - Execute assembly instructions without changing PC
3. **Assembly to memory (`@`)** - Assemble instructions into memory at a specific address
4. **Traditional commands** - File loading, stepping, memory inspection, etc.

## Assembly Syntax

All assembly instructions follow this general format:
- Register names: `R0` through `R15` (case-insensitive)
- Immediate values: `$42` (hex) or `42` (decimal)
- Whitespace and commas are flexible: `ADD R1, R2` or `ADD R1 R2` both work

## Immediate Execution Mode (`!`)

Execute a single assembly instruction immediately without affecting the program counter (PC). This is perfect for:
- Quick calculations
- Testing instruction behavior
- Setting up register values for experiments

### Syntax
```
!<instruction>
```

### Examples

**Basic arithmetic:**
```
oper8> !LDI0 $42
Executed: LDI0 $42
=== CPU State ===
PC: 0200  Flags: Z=0 C=0 N=0
Registers:
  R0: 42  R1: 00  R2: 00  R3: 00
  ...

oper8> !LDLO R1, $5
Executed: LDLO R1, $5
=== CPU State ===
PC: 0200  Flags: Z=0 C=0 N=0
Registers:
  R0: 42  R1: 05  R2: 00  R3: 00
  ...

oper8> !ADD R0, R1
Executed: ADD R0, R1
=== CPU State ===
PC: 0200  Flags: Z=0 C=0 N=0
Registers:
  R0: 47  R1: 05  R2: 00  R3: 00
  ...
```

**Loading 16-bit values:**
```
oper8> !LDI16 R2, R3, $1234
Executed: LDI16 R2, R3, $1234
=== CPU State ===
Registers:
  R0: 00  R1: 00  R2: 12  R3: 34
  ...
```

**Testing logical operations:**
```
oper8> !LDI0 $F0
oper8> !LDLO R1, $0F
oper8> !OR R0, R1
Executed: OR R0, R1
=== CPU State ===
Registers:
  R0: FF  R1: 0F  R2: 00  R3: 00
  ...
```

**Testing bit operations:**
```
oper8> !LDI0 $80
oper8> !LDLO R1, $80
oper8> !TEST R0, R1
Executed: TEST R0, R1
=== CPU State ===
PC: 0200  Flags: Z=0 C=0 N=1
Registers:
  R0: 80  R1: 80  R2: 00  R3: 00
  ...
```

## Assembly to Memory (`@`)

### Set PC to Address

Set the program counter to a specific address:

```
@<address>
```

**Example:**
```
oper8> @0400
PC set to 0400
```

### Assemble Single Instruction

Assemble instructions directly into memory at a specific address. Use this to:
- Build programs interactively
- Patch code
- Set up test scenarios

**Syntax:**
```
@<address> <instruction>
```

Address should be in hexadecimal (without `$` prefix).

**Examples:**

Build a simple "Hello" program:
```
oper8> @0200 LDI0 $48
Assembled at 0200: 12 48

oper8> @0202 STORZ $FA
Assembled at 0202: 23 FA

oper8> @0204 HLT
Assembled at 0204: FF FF

oper8> dis 0200 3
0200: 12 48  LDI0 $48
0202: 23 FA  STORZ $FA
0204: FF FF  HLT

oper8> run
Loaded 0 bytes from
Starting execution...

H
Execution complete. Total steps: 3
Halted: true
```

**Build a loop that counts:**
```
oper8> @0200 LDI0 $00
Assembled at 0200: 12 00

oper8> @0202 INC R0
Assembled at 0202: 34 00

oper8> @0204 LDLO R1, $0A
Assembled at 0204: 10 1A

oper8> @0206 CMP R0, R1
Assembled at 0206: 36 01

oper8> @0208 JNZ $F8
Assembled at 0208: 53 F8

oper8> @020A HLT
Assembled at 020A: FF FF

oper8> dis 0200 6
0200: 12 00  LDI0 $00
0202: 34 00  INC R0
0204: 10 1A  LDLO R1, $0A
0206: 36 01  CMP R0, R1
0208: 53 F8  JNZ -8
020A: FF FF  HLT

oper8> run
Executed 52 steps
=== CPU State ===
PC: 020A  Flags: Z=1 C=0 N=0
Registers:
  R0: 0A  R1: 0A  R2: 00  R3: 00
  ...
```

## Multi-Line Assembly (`asm`)

Enter multiple lines of assembly code at the current PC. This is the most convenient way to write larger programs interactively.

### Syntax
```
asm
<instruction>
<instruction>
$<data_word>
...
<blank line to exit>
```

### Features
- Assembles at current PC and auto-increments
- Supports instructions and raw data words (prefixed with `$`)
- Shows address and bytes as you enter each line
- Exit with blank line

### Example

```
oper8> @0400
PC set to 0400

oper8> asm
Assembling at PC=0400 (enter blank line to exit):
  LDI0 $06
  0400: 12 06 ; LDI0 $06
  LDLO R1, $1
  0402: 10 11 ; LDLO R1, $1
  LDI16 R2, R3, $1234
  0404: 13 23 12 34 ; LDI16 R2, R3, $1234
  $ABCD
  0408: AB CD ; data word $ABCD
  JMPL R2, R3
  040A: 51 23 ; JMPL R2, R3

Assembly complete. 12 bytes written.

oper8> dis 0400 6
0400: 12 06  LDI0 $06
0402: 10 11  LDLO R1, $01
0404: 13 23  LDI16 R2, R3, $1234
0408: AB CD  ??? [$AB $CD]
040A: 51 23  JMPL R2, R3
040C: 00 00  NOP
```

**Workflow:**
1. Use `@<addr>` to set PC to starting address
2. Use `asm` to enter multi-line assembly mode
3. Enter instructions and data one per line
4. Press Enter on blank line to exit
5. Use `dis` to verify your code

## Standard Commands

### `help`
Display all available commands.

```
oper8> help
Commands:
  !<instruction>  - Execute assembly instruction immediately (PC unchanged)
                    Example: !LDLO R5, $A
  @<addr> <inst>  - Assemble instruction into memory at address
                    Example: @0200 ADD R1, R2
  load <file>     - Load binary file into memory at PC
  run [steps]     - Run CPU (max steps, default 100000)
  step            - Execute one instruction
  reset           - Reset CPU
  regs            - Show registers
  mem <addr>      - Show memory at address (hex)
  dis <addr> [n]  - Disassemble n instructions at address
  poke <addr> <val> - Write byte to memory (hex)
  quit            - Exit
```

### `regs`
Show current CPU state (registers, PC, flags).

```
oper8> regs
=== CPU State ===
PC: 0200  Flags: Z=0 C=0 N=0
Registers:
  R0: 00  R1: 05  R2: 12  R3: 34
  R4: 00  R5: 0A  R6: 00  R7: 00
  R8: 00  R9: 00  R10: 00  R11: 00
  R12: 00  R13: 00  R14: 00  R15: 00
```

### `mem <addr> [count]`
Display memory contents in hexadecimal. Address in hex, count is optional (default 16 bytes).

```
oper8> mem 0200 32
0200: 12 48 23 FA FF FF 00 00 00 00 00 00 00 00 00 00
0210: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

### `dis <addr> [count]`
Disassemble instructions starting at address. Count is optional (default 8 instructions).

```
oper8> dis 0200 5
0200: 12 48  LDI0 $48
0202: 23 FA  STORZ $FA
0204: FF FF  HLT
0206: 00 00  NOP
0208: 00 00  NOP
```

### `poke <addr> <value>`
Write a single byte to memory. Both address and value in hex.

```
oper8> poke 0200 12
Wrote 12 to 0200

oper8> poke 0201 48
Wrote 48 to 0201
```

### `load <file>`
Load a binary file into memory starting at current PC.

```
oper8> load program.bin
Loaded 256 bytes
```

### `step`
Execute one instruction at current PC and show resulting state.

```
oper8> step
=== CPU State ===
PC: 0202  Flags: Z=0 C=0 N=0
Registers:
  R0: 48  R1: 00  R2: 00  R3: 00
  ...
```

### `run [maxsteps]`
Execute instructions starting at PC until halt or max steps reached (default 100000).

```
oper8> run
Executed 15 steps
=== CPU State ===
PC: 0210  Flags: Z=1 C=0 N=0
Halted: true
```

### `reset`
Reset CPU to initial state (PC=$0200, all registers cleared, flags cleared).

```
oper8> reset
CPU reset
```

### `quit` / `exit`
Exit interactive mode.

```
oper8> quit
Goodbye!
```

## Complete Examples

### Example 1: Calculate Fibonacci Number

```
oper8> !LDI0 $01        # F(0) = 1
oper8> !LDLO R1, $01    # F(1) = 1
oper8> !LDLO R2, $08    # Count 8 iterations
oper8> !ADD R0, R1      # F(n) = F(n-1) + F(n-2)
oper8> !SWAP R0, R1     # Shift values
oper8> !DEC R2          # Decrement counter
oper8> regs
=== CPU State ===
PC: 0200  Flags: Z=0 C=0 N=0
Registers:
  R0: 01  R1: 02  R2: 07  R3: 00
  ...
```

### Example 2: Test Character I/O

```
oper8> !LDI0 $48        # ASCII 'H'
oper8> !STORZ $FA       # Write to output port
H
oper8> !LDI0 $69        # ASCII 'i'
oper8> !STORZ $FA       # Write to output port
i
```

### Example 3: Build and Run Multiply Program (using `asm`)

```
oper8> @0200
PC set to 0200

oper8> asm
Assembling at PC=0200 (enter blank line to exit):
  LDI0 $06
  0200: 12 06 ; LDI0 $06
  LDLO R1, $07
  0202: 10 17 ; LDLO R1, $07
  MUL R0, R1
  0204: 37 01 ; MUL R0, R1
  HLT
  0206: FF FF ; HLT

Assembly complete. 8 bytes written.

oper8> dis 0200 4
0200: 12 06  LDI0 $06
0202: 10 17  LDLO R1, $07
0204: 37 01  MUL R0, R1
0206: FF FF  HLT

oper8> run
Executed 4 steps
=== CPU State ===
PC: 0206  Flags: Z=0 C=0 N=0
Registers:
  R0: 00  R1: 2A  R2: 00  R3: 00
  ...
```
Result: R0:R1 = $002A = 42 decimal

### Example 4: Test Fault Handling

```
oper8> !LDI0 $05
oper8> !LDLO R1, $00    # Set R1 to 0 (divisor)
oper8> !DIV R0, R1      # Divide by zero - triggers fault!
Executed: DIV R0, R1
=== CPU State ===
PC: FFFE  Flags: Z=0 C=0 N=0
Registers:
  R0: 02  R1: 00  R2: 00  R3: 00    # R0 contains fault code $02
  ...

oper8> mem 00FC 4
00FC: 01 00 FF FE       # Fault PC stored at $00FC-$00FD
```

### Example 5: Build a Loop with Data Table

```
oper8> @0300
PC set to 0300

oper8> asm
Assembling at PC=0300 (enter blank line to exit):
  LDI0 $00
  0300: 12 00 ; LDI0 $00
  LDLO R1, $03
  0302: 10 13 ; LDLO R1, $03
  LDHI R1, $03
  0304: 11 13 ; LDHI R1, $03
  LOAD R2, R1
  0306: 20 21 ; LOAD R2, R1
  ADD R0, R2
  0308: 30 02 ; ADD R0, R2
  INC R1
  030A: 34 10 ; INC R1
  LDLO R3, $04
  030C: 10 34 ; LDLO R3, $04
  CMP R1, R3
  030E: 36 13 ; CMP R1, R3
  JC $F6
  0310: 54 F6 ; JC $F6
  HLT
  0312: FF FF ; HLT

Assembly complete. 20 bytes written.

oper8> @0330
PC set to 0330

oper8> asm
Assembling at PC=0330 (enter blank line to exit):
  $000A
  0330: 00 0A ; data word $000A
  $0014
  0332: 00 14 ; data word $0014
  $001E
  0334: 00 1E ; data word $001E
  $0028
  0336: 00 28 ; data word $0028

Assembly complete. 8 bytes written.

oper8> @0300
PC set to 0300

oper8> run
Executed 43 steps
=== CPU State ===
PC: 0312  Flags: Z=0 C=0 N=0
Registers:
  R0: 64  R1: 34  R2: 28  R3: 04
  ...
```
Result: R0 = $64 = 100 decimal (sum of 10 + 20 + 30 + 40)

## Tips and Tricks

1. **Use `!` for quick experiments** - Test instruction behavior without writing to program memory
2. **Use `asm` for building programs** - Multi-line assembly is the fastest way to write code
3. **Use `@<addr>` to set PC** - Quick way to position for assembly or execution
4. **Use `dis` to verify** - Always check your assembled code looks correct
4. **Save PC with `regs`** - Note the PC value before experiments so you can restore state
5. **Combine commands** - Use `!` to set up registers, then `step` to execute program code
6. **Memory-mapped I/O** - Use `$00FA` for output, `$00FB` for input (returns 0 if none available)
7. **Fault handling** - Check `$00FC-$00FD` for fault PC, `$00FE-$00FF` for handler vector

## Number Formats

- **Hexadecimal**: `$42` or `0x42` → 66 decimal
- **Decimal**: `42` → 42 decimal
- **Registers**: `R0` through `R15` (case-insensitive)

## Common Patterns

**Load full 8-bit value into any register:**
```
!LDLO R5, $A      # Lower nibble
!LDHI R5, $B      # Upper nibble → R5 = $BA
```

**Load full 8-bit value into R0 (shortcut):**
```
!LDI0 $42         # R0 = $42 directly
```

**Test if register is zero:**
```
!TEST R5, R5      # Sets Z flag if R5 is zero
!regs             # Check Z flag
```

**Clear a register:**
```
!XOR R3, R3       # R3 = R3 XOR R3 = 0
```

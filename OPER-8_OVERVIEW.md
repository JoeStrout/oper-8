# OPER-8 CPU Specification

## Objectives

- 8-bit CPU suitable for use in fantasy computers/consoles
- simple design, easy to implement
- complete enough to be pleasant to program
- detailed docs, specs, and tests to help ensure all implementations are compliant

## Design Summary

**Architecture:**
- 16 general-purpose 8-bit registers (R0-R15)
- 2-byte fixed-width instructions: opcode byte + operand byte
  - instructions _must_ start on an even address
- 64K address space (16-bit addressing)
- Big-endian byte ordering
- Flags: Zero, Carry, Negative

**Key Decisions:**
- R0 is special only for zero-page memory operations (LOADZ, STORZ) and LDI0
- Register pairs (Rx:Rx+1) form 16-bit pointers/values
- Register numbers wrap at 4 bits (R15:R0 is a valid pair)
- R14:R15 conventionally used as stack pointer (SP)
- Two-address instruction format (destination = first operand)
- Carry flag enables multi-byte arithmetic via ADC/SBC
- Input/output will mostly work via memory-mapped IO in page 0

## Opcode Table

### Data Movement (Group 1)
| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $10 | LDLO | Rx, #imm | Load immediate into lower nibble of Rx (clear upper) |
| $11 | LDHI | Rx, #imm | Load immediate into upper nibble of Rx (preserve lower) |
| $12 | LDI0 | #imm | Load immediate 8-bit value into R0 |
| $13 | LDI16 | Rx, Ry | Load 16-bit immediate from next word into Rx:Ry |
| $14 | MOV | Rx, Ry | Copy Ry to Rx |
| $15 | SWAP | Rx, Ry | Exchange Rx ↔ Ry |

### Memory Access (Group 2)
| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $20 | LOAD | Rx, Ry | Load Rx from address [Ry:Ry+1] |
| $21 | STOR | Rx, Ry | Store Rx to address [Ry:Ry+1] |
| $22 | LOADZ | #addr | Load R0 from zero-page [$00addr] |
| $23 | STORZ | #addr | Store R0 to zero-page [$00addr] |

### Arithmetic (Group 3)
| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $30 | ADD | Rx, Ry | Rx = Rx + Ry, set flags |
| $31 | ADC | Rx, Ry | Rx = Rx + Ry + Carry, set flags |
| $32 | SUB | Rx, Ry | Rx = Rx - Ry, set flags |
| $33 | SBC | Rx, Ry | Rx = Rx - Ry - Borrow, set flags |
| $34 | INC | Rx | Rx = Rx + 1 |
| $35 | DEC | Rx | Rx = Rx - 1 |
| $36 | CMP | Rx, Ry | Compare Rx with Ry (sets flags, no store) |
| $37 | MUL | Rx, Ry | Rx:Rx+1 = Rx * Ry (unsigned, 16-bit result) |
| $38 | DIV | Rx, Ry | Rx = Rx / Ry, Rx+1 = remainder (unsigned) |

### Logical Operations (Group 4)
| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $40 | AND | Rx, Ry | Rx = Rx & Ry |
| $41 | OR | Rx, Ry | Rx = Rx \| Ry |
| $42 | XOR | Rx, Ry | Rx = Rx ^ Ry |
| $43 | NOT | Rx | Rx = ~Rx (bitwise complement) |
| $44 | SHL | Rx | Shift Rx left, shift Carry into bit 0 |
| $45 | SHR | Rx | Shift Rx right, shift Carry into bit 7 |
| $46 | TEST | Rx, Ry | Test Rx & Ry (sets C and Z, no store) |

### Control Flow (Group 5)
| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $50 | JMP | offset | PC = PC + signed offset |
| $51 | JMPL | Rx, Ry | PC = [Rx:Ry] (long jump to absolute address) |
| $52 | JZ | offset | Jump if Zero flag set |
| $53 | JNZ | offset | Jump if Zero flag clear |
| $54 | JC | offset | Jump if Carry flag set |
| $55 | JNC | offset | Jump if Carry flag clear |
| $56 | JN | offset | Jump if Negative flag set |
| $57 | CALL | offset | Push PC, then jump to PC + offset |
| $58 | CALLL | Rx, Ry | Push PC, then jump to [Rx:Ry] (long call) |
| $59 | RET | - | Pop PC from stack |

### Stack Operations (Group 6)
| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $60 | PUSH | Rx, Ry | Push registers from Rx toward Ry (inclusive) |
| $61 | POP | Rx, Ry | Pop registers from Rx toward Ry (inclusive) |

### Miscellaneous (Group 7)
| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $00 | NOP | - | No operation |
| $FF | HLT | - | Halt execution |

## Total Opcodes: 39

This leaves significant room for future expansion (I/O ports, interrupts, etc.).

### Operand Byte Structure

**Two-register format** (most instructions):
```
[xxxx yyyy]
 Rx   Ry
```

**Single 8-bit immediate** (LDLO, LDHI, LOADZ, STORZ, JMP, etc.):
```
[iiii iiii]
 8-bit value
```

**LDI16 special case:**
- Fully loads two registers at once from 2 bytes immediately following
- Operand byte specifies registers Rx:Ry to load
- Following word may be thought of as 16-bit value, or two 8-bit values for Rx and Ry respectively (thanks to our big-endian byte order)

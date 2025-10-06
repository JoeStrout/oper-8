# OPER-8 Opcode Technical Details

This document provides comprehensive technical specifications for each OPER-8 opcode, including exact behavior, flag effects, and edge cases.

## Flag Reference

The OPER-8 CPU has three status flags:
- **Z (Zero)**: Set when result equals 0
- **C (Carry)**: Set on arithmetic overflow/carry out
- **N (Negative)**: Set when bit 7 of result is 1

## Data Movement Instructions

### $10 - LDLO (Load Low Nibble)
**Format:** `LDLO Rx, #imm`
**Encoding:** `$10 [xxxx iiii]`

**Operation:**
```
Rx[7:4] ← 0
Rx[3:0] ← imm[3:0]
```

**Flags:** None affected

**Details:**
- Clears upper nibble (bits 7-4) to 0
- Loads immediate value's lower 4 bits into lower nibble (bits 3-0)
- Upper 4 bits of immediate value are ignored
- Useful for loading small constants (0-15)

---

### $11 - LDHI (Load High Nibble)
**Format:** `LDHI Rx, #imm`
**Encoding:** `$11 [xxxx iiii]`

**Operation:**
```
Rx[7:4] ← imm[3:0]
Rx[3:0] ← unchanged
```

**Flags:** None affected

**Details:**
- Preserves lower nibble (bits 3-0)
- Loads immediate value's lower 4 bits into upper nibble (bits 7-4)
- Upper 4 bits of immediate value are ignored
- Combined with LDLO, allows loading any 8-bit value in 2 instructions

---

### $12 - LDI0 (Load Immediate to R0)
**Format:** `LDI0 #imm`
**Encoding:** `$12 [iiii iiii]`

**Operation:**
```
R0 ← imm
```

**Flags:** None affected

**Details:**
- Loads 8-bit immediate value directly into R0
- Provides efficient single-instruction load for R0
- Full 8-bit operand byte used as immediate value

---

### $13 - LDI16 (Load 16-bit Immediate)
**Format:** `LDI16 Rx, Ry`
**Encoding:** `$13 [xxxx yyyy]` followed by 2-byte immediate

**Operation:**
```
Rx ← memory[PC+2]
Ry ← memory[PC+3]
PC ← PC + 4
```

**Flags:** None affected

**Details:**
- Loads 16-bit immediate from next 2 bytes in memory
- First byte goes to Rx, second byte to Ry (big-endian)
- Total instruction length: 4 bytes (opcode + operand + 2 immediate bytes)
- Can form 16-bit value in register pair Rx:Ry
- PC advances by 4 (instead of the usual 2) to skip over immediate data

---

### $14 - MOV (Move Register)
**Format:** `MOV Rx, Ry`
**Encoding:** `$14 [xxxx yyyy]`

**Operation:**
```
Rx ← Ry
```

**Flags:** None affected

**Details:**
- Copies value from Ry to Rx
- Ry remains unchanged
- Can copy register to itself (no-op)

---

### $15 - SWAP (Swap Registers)
**Format:** `SWAP Rx, Ry`
**Encoding:** `$15 [xxxx yyyy]`

**Operation:**
```
temp ← Rx
Rx ← Ry
Ry ← temp
```

**Flags:** None affected

**Details:**
- Exchanges values between Rx and Ry
- Single atomic operation (no intermediate storage required by programmer)
- SWAP Rx, Rx is a no-op

---

## Memory Access Instructions

### $20 - LOAD (Load from Memory)
**Format:** `LOAD Rx, Ry`
**Encoding:** `$20 [xxxx yyyy]`

**Operation:**
```
address ← (Ry << 8) | Ry+1
Rx ← memory[address]
```

**Flags:** None affected

**Details:**
- Forms 16-bit address from register pair Ry:Ry+1 (big-endian)
- Ry contains high byte, Ry+1 contains low byte
- Loads single byte from computed address into Rx
- Register numbers wrap: R15+1 = R0
- Ry and Ry+1 remain unchanged

---

### $21 - STOR (Store to Memory)
**Format:** `STOR Rx, Ry`
**Encoding:** `$21 [xxxx yyyy]`

**Operation:**
```
address ← (Ry << 8) | Ry+1
memory[address] ← Rx
```

**Flags:** None affected

**Details:**
- Forms 16-bit address from register pair Ry:Ry+1 (big-endian)
- Stores single byte from Rx to computed address
- All registers remain unchanged

---

### $22 - LOADZ (Load from Zero Page)
**Format:** `LOADZ #addr`
**Encoding:** `$22 [aaaa aaaa]`

**Operation:**
```
R0 ← memory[$00addr]
```

**Flags:** None affected

**Details:**
- Loads from zero page (addresses $0000-$00FF)
- High byte of address is always $00
- Result always goes to R0
- Efficient 2-byte instruction for common memory operations
- Useful for accessing zero-page variables

---

### $23 - STORZ (Store to Zero Page)
**Format:** `STORZ #addr`
**Encoding:** `$23 [aaaa aaaa]`

**Operation:**
```
memory[$00addr] ← R0
```

**Flags:** None affected

**Details:**
- Stores to zero page (addresses $0000-$00FF)
- High byte of address is always $00
- Value always comes from R0
- Efficient 2-byte instruction for common memory operations

---

## Arithmetic Instructions

### $30 - ADD (Add)
**Format:** `ADD Rx, Ry`
**Encoding:** `$30 [xxxx yyyy]`

**Operation:**
```
result ← Rx + Ry
Rx ← result & $FF
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Set if result > $FF (unsigned overflow)
- **N:** Set if bit 7 of result is 1

**Details:**
- 8-bit unsigned addition
- Result stored in Rx
- Ry remains unchanged
- Carry flag set on overflow, enabling multi-byte arithmetic with ADC

---

### $31 - ADC (Add with Carry)
**Format:** `ADC Rx, Ry`
**Encoding:** `$31 [xxxx yyyy]`

**Operation:**
```
result ← Rx + Ry + C
Rx ← result & $FF
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Set if result > $FF (unsigned overflow)
- **N:** Set if bit 7 of result is 1

**Details:**
- 8-bit addition including carry flag
- Essential for multi-byte addition
- Example 16-bit add: `ADD R0,R2` then `ADC R1,R3`
- Carry from previous operation included in sum

---

### $32 - SUB (Subtract)
**Format:** `SUB Rx, Ry`
**Encoding:** `$32 [xxxx yyyy]`

**Operation:**
```
result ← Rx - Ry
Rx ← result & $FF
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Set if Ry > Rx (borrow occurred)
- **N:** Set if bit 7 of result is 1

**Details:**
- 8-bit unsigned subtraction
- Result stored in Rx
- Carry flag indicates borrow (set when subtraction underflows)
- For signed comparison, check N and Z flags after operation

---

### $33 - SBC (Subtract with Carry/Borrow)
**Format:** `SBC Rx, Ry`
**Encoding:** `$33 [xxxx yyyy]`

**Operation:**
```
result ← Rx - Ry - C
Rx ← result & $FF
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Set if (Ry + C) > Rx (borrow occurred)
- **N:** Set if bit 7 of result is 1

**Details:**
- 8-bit subtraction including borrow (carry flag)
- Essential for multi-byte subtraction
- Carry flag represents borrow from previous operation
- Example 16-bit subtract: `SUB R0,R2` then `SBC R1,R3`

---

### $34 - INC (Increment)
**Format:** `INC Rx`
**Encoding:** `$34 [xxxx 0000]`

**Operation:**
```
Rx ← (Rx + 1) & $FF
```

**Flags:**
- **Z:** Set if result == 0 (wrapped from $FF to $00)
- **C:** Set if result wrapped ($FF + 1 = $00)
- **N:** Set if bit 7 of result is 1

**Details:**
- Increments register by 1
- Wraps from $FF to $00
- Lower nibble of operand byte ignored (should be 0)

---

### $35 - DEC (Decrement)
**Format:** `DEC Rx`
**Encoding:** `$35 [xxxx 0000]`

**Operation:**
```
Rx ← (Rx - 1) & $FF
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Set if wrapped ($00 - 1 = $FF)
- **N:** Set if bit 7 of result is 1

**Details:**
- Decrements register by 1
- Wraps from $00 to $FF
- Lower nibble of operand byte ignored (should be 0)

---

### $36 - CMP (Compare)
**Format:** `CMP Rx, Ry`
**Encoding:** `$36 [xxxx yyyy]`

**Operation:**
```
result ← Rx - Ry
(result discarded, only flags set)
```

**Flags:**
- **Z:** Set if Rx == Ry
- **C:** Set if Ry > Rx (unsigned comparison)
- **N:** Set if bit 7 of (Rx - Ry) is 1

**Details:**
- Performs subtraction but doesn't store result
- Both registers remain unchanged
- Use with conditional jumps to implement comparisons:
  - Equal: Z=1
  - Not equal: Z=0
  - Rx < Ry (unsigned): C=1
  - Rx >= Ry (unsigned): C=0
  - Rx > Ry (unsigned): C=0 AND Z=0
  - Rx <= Ry (unsigned): C=1 OR Z=1

---

### $37 - MUL (Multiply)
**Format:** `MUL Rx, Ry`
**Encoding:** `$37 [xxxx yyyy]`

**Operation:**
```
result16 ← Rx × Ry (unsigned)
Rx ← (result16 >> 8) & $FF    (high byte)
Rx+1 ← result16 & $FF          (low byte)
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Set if result > $FF (high byte non-zero)
- **N:** Set if bit 7 of low byte (Rx+1) is 1

**Details:**
- Unsigned 8-bit × 8-bit multiplication
- Produces 16-bit result in register pair Rx:Rx+1
- High byte in Rx, low byte in Rx+1 (big-endian)
- Ry remains unchanged
- Register numbers wrap: if Rx=R15, then Rx+1=R0
- Maximum result: $FF × $FF = $FE01

---

### $38 - DIV (Divide)
**Format:** `DIV Rx, Ry`
**Encoding:** `$38 [xxxx yyyy]`

**Operation:**
```
quotient ← Rx ÷ Ry (unsigned, integer division)
remainder ← Rx mod Ry
Rx ← quotient
Rx+1 ← remainder
```

**Flags:**
- **Z:** Set if quotient == 0
- **C:** Cleared (always 0)
- **N:** Set if bit 7 of quotient (Rx) is 1

**Details:**
- Unsigned 8-bit ÷ 8-bit division
- Quotient stored in Rx
- Remainder stored in Rx+1
- Division by zero: quotient=$FF, remainder=Rx (undefined behavior)
- Ry remains unchanged
- Register numbers wrap: if Rx=R15, then Rx+1=R0

---

## Logical Operations

### $40 - AND (Bitwise AND)
**Format:** `AND Rx, Ry`
**Encoding:** `$40 [xxxx yyyy]`

**Operation:**
```
Rx ← Rx & Ry
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Cleared (always 0)
- **N:** Set if bit 7 of result is 1

**Details:**
- Bitwise AND operation
- Result stored in Rx
- Ry remains unchanged
- Useful for masking bits

---

### $41 - OR (Bitwise OR)
**Format:** `OR Rx, Ry`
**Encoding:** `$41 [xxxx yyyy]`

**Operation:**
```
Rx ← Rx | Ry
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Cleared (always 0)
- **N:** Set if bit 7 of result is 1

**Details:**
- Bitwise OR operation
- Result stored in Rx
- Ry remains unchanged
- Useful for setting bits

---

### $42 - XOR (Bitwise Exclusive OR)
**Format:** `XOR Rx, Ry`
**Encoding:** `$42 [xxxx yyyy]`

**Operation:**
```
Rx ← Rx ^ Ry
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Cleared (always 0)
- **N:** Set if bit 7 of result is 1

**Details:**
- Bitwise XOR operation
- Result stored in Rx
- Ry remains unchanged
- XOR Rx, Rx clears Rx to 0 (sets Z flag)
- Useful for toggling bits

---

### $43 - NOT (Bitwise NOT/Complement)
**Format:** `NOT Rx`
**Encoding:** `$43 [xxxx 0000]`

**Operation:**
```
Rx ← ~Rx
```

**Flags:**
- **Z:** Set if result == 0 (never, since ~$00 = $FF)
- **C:** Cleared (always 0)
- **N:** Set if bit 7 of result is 1

**Details:**
- Bitwise complement (one's complement)
- Inverts all bits in register
- Lower nibble of operand byte ignored (should be 0)
- NOT $00 = $FF, NOT $FF = $00

---

### $44 - SHL (Shift Left)
**Format:** `SHL Rx`
**Encoding:** `$44 [xxxx 0000]`

**Operation:**
```
bit7 ← Rx[7]
Rx ← (Rx << 1) & $FF
Rx[0] ← C
C ← bit7
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Set to bit 7 of original value (bit shifted out)
- **N:** Set if bit 7 of result is 1

**Details:**
- Shifts all bits left by one position
- Carry flag shifted into bit 0
- Bit 7 shifted out into carry flag
- Enables multi-byte left shifts by chaining SHL operations
- Lower nibble of operand byte ignored (should be 0)

---

### $45 - SHR (Shift Right)
**Format:** `SHR Rx`
**Encoding:** `$45 [xxxx 0000]`

**Operation:**
```
bit0 ← Rx[0]
Rx ← Rx >> 1
Rx[7] ← C
C ← bit0
```

**Flags:**
- **Z:** Set if result == 0
- **C:** Set to bit 0 of original value (bit shifted out)
- **N:** Set if bit 7 of result is 1 (i.e., if carry was 1)

**Details:**
- Shifts all bits right by one position
- Carry flag shifted into bit 7
- Bit 0 shifted out into carry flag
- Enables multi-byte right shifts by chaining SHR operations
- Lower nibble of operand byte ignored (should be 0)

---

### $46 - TEST (Test Bits)
**Format:** `TEST Rx, Ry`
**Encoding:** `$46 [xxxx yyyy]`

**Operation:**
```
result ← Rx & Ry
(result discarded, only flags set)
```

**Flags:**
- **Z:** Set if (Rx & Ry) == 0
- **C:** Unchanged
- **N:** Set if bit 7 of (Rx & Ry) is 1

**Details:**
- Performs bitwise AND but doesn't store result
- Both registers remain unchanged
- Useful for testing if specific bits are set
- Common idioms:
  - `TEST Rx, Rx` - test if Rx is zero (sets Z if zero)
  - `TEST Rx, Ry` with Ry as bit mask - test specific bits
- Unlike other logical operations (AND/OR/XOR/NOT), TEST preserves the Carry flag
- This allows testing values mid-calculation without losing carry state

**Examples:**
```
; Test if R1 is zero
TEST R1, R1
JZ is_zero

; Test if bit 7 of R1 is set
LDI0 $80
TEST R1, R0
JN bit7_set

; Test if R1 and R2 have any common bits set
TEST R1, R2
JNZ have_common_bits
```

---

## Control Flow Instructions

### $50 - JMP (Jump Relative)
**Format:** `JMP offset`
**Encoding:** `$50 [oooo oooo]`

**Operation:**
```
PC ← PC + 2 + signed(offset)
```

**Flags:** None affected

**Details:**
- Unconditional relative jump
- Offset is signed 8-bit value (-128 to +127)
- Jump is relative to address after this instruction (PC+2)
- Jump range: -128 to +127 from next instruction
- For jumps to exact multiples of 2 only (instruction alignment)
- Negative offset: two's complement representation

---

### $51 - JMPL (Jump Long/Absolute)
**Format:** `JMPL Rx, Ry`
**Encoding:** `$51 [xxxx yyyy]`

**Operation:**
```
PC ← (Rx << 8) | Ry
```

**Flags:** None affected

**Details:**
- Unconditional absolute jump
- Target address formed from register pair Rx:Ry (big-endian)
- Can jump anywhere in 64K address space
- Registers remain unchanged after jump
- Use for computed jumps, jump tables, etc.

---

### $52 - JZ (Jump if Zero)
**Format:** `JZ offset`
**Encoding:** `$52 [oooo oooo]`

**Operation:**
```
if (Z == 1)
    PC ← PC + 2 + signed(offset)
else
    PC ← PC + 2
```

**Flags:** None affected

**Details:**
- Conditional jump based on Zero flag
- Offset is signed 8-bit value (-128 to +127)
- Jump is relative to address after this instruction
- Use after CMP, arithmetic, or logical operations
- Falls through if Z=0

---

### $53 - JNZ (Jump if Not Zero)
**Format:** `JNZ offset`
**Encoding:** `$53 [oooo oooo]`

**Operation:**
```
if (Z == 0)
    PC ← PC + 2 + signed(offset)
else
    PC ← PC + 2
```

**Flags:** None affected

**Details:**
- Conditional jump when Zero flag is clear
- Offset is signed 8-bit value (-128 to +127)
- Jump is relative to address after this instruction
- Useful for loop continuation, inequality tests
- Falls through if Z=1

---

### $54 - JC (Jump if Carry)
**Format:** `JC offset`
**Encoding:** `$54 [oooo oooo]`

**Operation:**
```
if (C == 1)
    PC ← PC + 2 + signed(offset)
else
    PC ← PC + 2
```

**Flags:** None affected

**Details:**
- Conditional jump when Carry flag is set
- After ADD/ADC: jump if overflow occurred
- After SUB/SBC/CMP: jump if borrow occurred (Ry > Rx)
- Offset is signed 8-bit value (-128 to +127)
- Falls through if C=0

---

### $55 - JNC (Jump if No Carry)
**Format:** `JNC offset`
**Encoding:** `$55 [oooo oooo]`

**Operation:**
```
if (C == 0)
    PC ← PC + 2 + signed(offset)
else
    PC ← PC + 2
```

**Flags:** None affected

**Details:**
- Conditional jump when Carry flag is clear
- After ADD/ADC: jump if no overflow
- After SUB/SBC/CMP: jump if no borrow (Rx >= Ry)
- Offset is signed 8-bit value (-128 to +127)
- Falls through if C=1

---

### $56 - JN (Jump if Negative)
**Format:** `JN offset`
**Encoding:** `$56 [oooo oooo]`

**Operation:**
```
if (N == 1)
    PC ← PC + 2 + signed(offset)
else
    PC ← PC + 2
```

**Flags:** None affected

**Details:**
- Conditional jump when Negative flag is set
- N flag reflects bit 7 of last result
- Useful for signed comparisons
- Offset is signed 8-bit value (-128 to +127)
- Falls through if N=0

---

### $57 - CALL (Call Subroutine)
**Format:** `CALL offset`
**Encoding:** `$57 [oooo oooo]`

**Operation:**
```
SP ← SP - 2
memory[SP] ← (PC + 2) >> 8        (high byte)
memory[SP + 1] ← (PC + 2) & $FF   (low byte)
PC ← PC + 2 + signed(offset)
```

**Flags:** None affected

**Details:**
- Pushes return address (PC+2) onto stack
- Return address is 2 bytes (big-endian: high byte first)
- SP is register pair R14:R15 by convention
- Then performs relative jump
- Offset is signed 8-bit value (-128 to +127)
- Stack grows downward (decrement before push)
- Return address points to instruction after CALL

---

### $58 - CALLL (Call Long/Absolute)
**Format:** `CALLL Rx, Ry`
**Encoding:** `$58 [xxxx yyyy]`

**Operation:**
```
SP ← SP - 2
memory[SP] ← PC >> 8              (high byte)
memory[SP + 1] ← PC & $FF         (low byte)
PC ← (Rx << 8) | Ry
```

**Flags:** None affected

**Details:**
- Pushes current PC onto stack
- Return address points to next instruction (PC after CALLL)
- Target address formed from register pair Rx:Ry
- Can call anywhere in 64K address space
- Useful for computed calls, function pointers
- Stack grows downward

---

### $59 - RET (Return from Subroutine)
**Format:** `RET`
**Encoding:** `$59 [0000 0000]`

**Operation:**
```
PC ← (memory[SP] << 8) | memory[SP + 1]
SP ← SP + 2
```

**Flags:** None affected

**Details:**
- Pops return address from stack into PC
- Address is 2 bytes (big-endian: high byte first)
- SP incremented after pop
- Must match CALL/CALLL to maintain stack balance
- Operand byte should be $00

---

## Stack Operations

### $60 - PUSH (Push Registers)
**Format:** `PUSH Rx, Ry`
**Encoding:** `$60 [xxxx yyyy]`

**Operation:**
```
for each register from Rx toward Ry (inclusive, incrementing):
    SP ← SP - 1
    memory[SP] ← register
```

**Flags:** None affected

**Details:**
- Pushes multiple registers onto stack
- Pushes in order: Rx, Rx+1, Rx+2, ..., Ry
- Register numbers wrap (R15 wraps to R0)
- If Rx > Ry numerically, wraps through R15 to R0
- Stack grows downward (pre-decrement)
- SP decremented before each store
- PUSH R5, R5 pushes single register R5

---

### $61 - POP (Pop Registers)
**Format:** `POP Rx, Ry`
**Encoding:** `$61 [xxxx yyyy]`

**Operation:**
```
for each register from Rx toward Ry (inclusive, incrementing):
    register ← memory[SP]
    SP ← SP + 1
```

**Flags:** None affected

**Details:**
- Pops multiple registers from stack
- Pops in order: Rx, Rx+1, Rx+2, ..., Ry
- Register numbers wrap (R15 wraps to R0)
- Stack shrinks upward (post-increment)
- SP incremented after each load
- Should match corresponding PUSH to restore correctly
- POP R5, R5 pops single register R5

---

## Miscellaneous Instructions

### $00 - NOP (No Operation)
**Format:** `NOP`
**Encoding:** `$00 [0000 0000]`

**Operation:**
```
PC ← PC + 2
```

**Flags:** None affected

**Details:**
- Does nothing except advance PC
- Takes up 2 bytes (opcode + operand)
- Useful for padding, timing, or code patching
- Operand byte should be $00

---

### $FF - HLT (Halt)
**Format:** `HLT`
**Encoding:** `$FF [0000 0000]`

**Operation:**
```
CPU execution stops
```

**Flags:** None affected

**Details:**
- Stops CPU execution
- PC remains at HLT instruction
- Implementation-specific: may wait for interrupt or require reset
- Operand byte should be $00
- Used to end programs or wait for external events

---

## Instruction Timing

All instructions execute in a fixed number of cycles (implementation-dependent). Typical cycle counts:
- Register operations: 1 cycle
- Memory operations: 2-3 cycles
- Multiplication/Division: 4-8 cycles
- Conditional branches: 1 cycle (not taken), 2 cycles (taken)

## Edge Cases and Notes

1. **Register Wrapping:** Register numbers wrap at 4 bits. R15+1 = R0. This affects LOAD/STOR, MUL, DIV, PUSH/POP.

2. **Instruction Alignment:** Instructions must start on even addresses. PC should always be even after instruction execution.

3. **Division by Zero:** DIV with Ry=0 sets Rx=$FF, Rx+1=original Rx value. This is undefined behavior.

4. **Stack Overflow:** No hardware detection. Stack can overwrite other memory regions.

5. **Big-Endian:** 16-bit values stored high byte first. Affects LDI16, LOAD/STOR, JMPL, CALL/RET, stack operations.

6. **Flag Persistence:** Flags retain values until modified by flag-affecting instructions. Not all instructions affect all flags.

7. **Carry Flag Usage:**
   - Arithmetic: Overflow/borrow indicator
   - Shifts: Bit rotation through carry
   - Some operations (AND/OR/XOR/NOT) clear carry

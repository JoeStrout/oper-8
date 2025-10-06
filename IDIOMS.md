# OPER-8 Programming Idioms

This document provides practical examples of common programming tasks on the OPER-8 CPU, organized by data type and use case. All examples have been tested on the reference implementation.

## Label Support

The OPER-8 assembler supports labels for easier programming:
- Define a label by placing it on its own line ending with a colon: `loop:`
- Reference labels in jump/branch instructions: `JMP loop`, `JZ done`, `CALL subroutine`
- Labels are automatically resolved to relative offsets during assembly
- Label names must start with a letter or underscore and contain only letters, numbers, and underscores

## Table of Contents

1. [8-bit Unsigned Values](#8-bit-unsigned-values)
2. [8-bit Signed Values](#8-bit-signed-values)
3. [16-bit Unsigned Values](#16-bit-unsigned-values)
4. [16-bit Signed Values](#16-bit-signed-values)
5. [Miscellaneous Idioms](#miscellaneous-idioms)

---

## 8-bit Unsigned Values

### Load Immediate Value

```assembly
LDI0 $42        ; Load $42 (66) into R0
LDI5 $FF        ; Load $FF (255) into R5
```

### Clear a Register

```assembly
; Method 1: Load zero
LDI3 $00        ; R3 = 0 (flags unaffected)

; Method 2: XOR with itself
XOR R3, R3      ; R3 = 0; Z = 1; C = 0; N = 0
```

### Copy Register

```assembly
MOV R5, R3      ; R5 = R3 (R3 unchanged)
```

### Swap Two Registers

```assembly
SWAP R1, R2     ; Exchange R1 and R2
```

### Increment and Decrement

```assembly
INC R0          ; R0 = R0 + 1
DEC R0          ; R0 = R0 - 1
```

### Add Two Values

```assembly
LDI0 $10        ; R0 = 16
LDI1 $20        ; R1 = 32
ADD R0, R1      ; R0 = 48, R1 unchanged
```

### Subtract Two Values

```assembly
LDI0 $50        ; R0 = 80
LDI1 $30        ; R1 = 48
SUB R0, R1      ; R0 = 32 (80 - 48)
```

### Multiply Two 8-bit Values (16-bit Result)

```assembly
LDI0 $12        ; R0 = 18
LDI1 $0A        ; R1 = 10
MUL R0, R1      ; R0:R1 = 180 ($00B4)
                ; R0 = $00 (high byte)
                ; R1 = $B4 (low byte)
```

### Divide Two Values (with Remainder)

```assembly
LDI0 $17        ; R0 = 23 (dividend)
LDI1 $05        ; R1 = 5 (divisor)
DIV R0, R1      ; R0 = 4 (quotient)
                ; R1 = 3 (remainder)
```

### Compare Unsigned Values

For unsigned comparisons, check the C (carry) and Z (zero) flags after CMP:

```assembly
LDI0 $42
LDI1 $30
CMP R0, R1      ; R0 - R1 = $12
                ; Z=0 (not equal)
                ; C=0 (no borrow, R0 >= R1)
                ; N=0 (result positive)

; Equal (R0 == R1): Z=1
JZ equal        ; Jump if equal
JNZ not_equal   ; Jump if not equal

; Unsigned less than (R0 < R1): C=1 (borrow occurred)
JC less_than    ; Jump if R0 < R1

; Unsigned greater or equal (R0 >= R1): C=0 (no borrow)
JNC greater_eq  ; Jump if R0 >= R1
```

### Sort Two Values

```assembly
; Sort R0 and R1 so that R0 <= R1
CMP R1, R0      ; Compare R1 with R0
JNC $02         ; Skip swap if R1 >= R0 (already sorted)
SWAP R0, R1     ; Otherwise swap them
; Now R0 <= R1 (R0 contains min, R1 contains max)
```

### Test if Value is Zero

```assembly
TEST R5, R5     ; Test R5 against itself
JZ is_zero      ; Jump if R5 == 0
JNZ not_zero    ; Jump if R5 != 0
```

### Test Specific Bits

```assembly
; Test if bit 7 is set
LDI1 $80        ; Bit 7 mask
TEST R0, R1     ; Test bit 7 of R0
JN bit7_set     ; Jump if bit 7 is set (N flag)

; Test if any of bits 0-3 are set
LDI1 $0F        ; Lower nibble mask
TEST R0, R1     ; Test lower nibble
JZ all_clear    ; Jump if all bits 0-3 are clear
```

### Set Specific Bits

```assembly
; Set bit 5 of R0
LDI1 $20        ; Bit 5 mask
OR R0, R1       ; R0 = R0 | $20
```

### Clear Specific Bits

```assembly
; Clear bit 5 of R0
LDI1 $DF        ; Inverted bit 5 mask (~$20)
AND R0, R1      ; R0 = R0 & $DF
```

### Toggle Specific Bits

```assembly
; Toggle bit 3 of R0
LDI1 $08        ; Bit 3 mask
XOR R0, R1      ; R0 = R0 ^ $08
```

### Shift Left (Multiply by 2)

```assembly
LDI0 $05        ; R0 = 5
XOR R1, R1      ; Clear carry
SHL R0          ; R0 = 10, C = 0
```

### Shift Right (Divide by 2)

```assembly
LDI0 $0A        ; R0 = 10
XOR R1, R1      ; Clear carry
SHR R0          ; R0 = 5, C = 0
```

### Rotate Left Through Carry (9-bit)

```assembly
; Rotate R0 left through carry
SHL R0          ; Bit 7 → C, C → bit 0
```

### Rotate Left 8-bit

```assembly
; Rotate R0 left (bit 7 wraps to bit 0)
SHL R0          ; Bit 7 → C, shift left
LDI1 $00
ADC R0, R1      ; Add carry (0 or 1) to bit 0
```

### Rotate Right 8-bit

```assembly
; Rotate R0 right (bit 0 wraps to bit 7)
SHR R0          ; Bit 0 → C, shift right
LDI1 $00
SHR R1          ; C → bit 7 of R1 (becomes $80 or $00)
OR R0, R1       ; Combine with rotated value
```

### Count Loop (Countdown)

```assembly
LDI0 $0A        ; Counter = 10
countdown_loop:
  ; ... loop body ...
  DEC R0        ; Counter--
  JNZ countdown_loop ; Continue if not zero
```

### Count Loop (Count Up)

```assembly
LDI0 $00        ; Counter = 0
LDI1 $0A        ; Limit = 10
countup_loop:
  ; ... loop body ...
  INC R0        ; Counter++
  CMP R0, R1    ; Compare with limit
  JNZ countup_loop ; Continue if not equal
```

---

## 8-bit Signed Values

Signed 8-bit values use two's complement representation:
- Range: -128 ($80) to +127 ($7F)
- Bit 7 is the sign bit: 0 = positive, 1 = negative

### Load Signed Values

```assembly
LDI0 $7F        ; R0 = +127 (largest positive)
LDI1 $80        ; R1 = -128 (largest negative)
LDI2 $FF        ; R2 = -1
LDI3 $01        ; R3 = +1
```

### Negate a Signed Value

```assembly
; Negate R0 (R0 = -R0)
NOT R0          ; R0 = ~R0 (one's complement)
INC R0          ; R0 = R0 + 1 (two's complement)
```

### Absolute Value

```assembly
; R0 = abs(R0)
TEST R0, R0     ; Check sign
JNN abs_done    ; If positive (N=0), skip
NOT R0          ; Negate: R0 = -R0
INC R0
abs_done:
```

### Compare Signed Values

For signed comparisons, check the N and Z flags after CMP:

```assembly
LDI0 $FE        ; R0 = -2
LDI1 $02        ; R1 = +2
CMP R0, R1      ; R0 - R1 = -4 ($FC)
                ; Sets N=1, Z=0

; Signed less than (R0 < R1): N=1 and Z=0
JN less_than    ; Jump if result is negative

; Signed greater or equal (R0 >= R1): N=0 or Z=1
JNN greater_eq  ; Jump if result is non-negative

; Equal (R0 == R1): Z=1
JZ equal        ; Jump if result is zero
```

### Sign Extension to 16-bit

Convert 8-bit signed value in R0 to 16-bit signed in R0:R1:

```assembly
; R0 contains 8-bit signed value
; Extend to R0:R1 (16-bit signed)
TEST R0, R0     ; Check if negative
LDI1 $00        ; Assume positive
JNN 2           ; If positive, R1 = $00
LDI1 $FF        ; If negative, R1 = $FF
; Now R1:R0 is 16-bit signed value
```

---

## 16-bit Unsigned Values

16-bit values are stored in register pairs using big-endian format (high byte first).

### Load 16-bit Immediate

```assembly
; Load $1234 into R0:R1
LDI0 $12        ; High byte
LDI1 $34        ; Low byte
```

### Clear 16-bit Value

```assembly
; Clear R2:R3
LDI2 0          ; R2 = 0
LDI3 0          ; R3 = 0
```

### Copy 16-bit Value

```assembly
; Copy R0:R1 to R2:R3
MOV R2, R0      ; Copy high byte
MOV R3, R1      ; Copy low byte
```

### Increment 16-bit Value

```assembly
; Increment R0:R1
INC R1          ; Increment low byte
JNC 2           ; If no carry, done
INC R0          ; Carry to high byte
```

### Decrement 16-bit Value

```assembly
; Decrement R0:R1
LDI2 $01
SUB R1, R2      ; Decrement low byte
JNC 2           ; If no borrow, done
DEC R0          ; Borrow from high byte
```

### Add Two 16-bit Values

```assembly
; Add R2:R3 to R0:R1 (result in R0:R1)
ADD R1, R3      ; Add low bytes
ADC R0, R2      ; Add high bytes with carry
```

### Subtract Two 16-bit Values

```assembly
; Subtract R2:R3 from R0:R1 (result in R0:R1)
SUB R1, R3      ; Subtract low bytes, set C if borrow
SBC R0, R2      ; Subtract high bytes with borrow
```

### Compare 16-bit Values

```assembly
; Compare R0:R1 with R2:R3
CMP R0, R2      ; Compare high bytes first
JNZ 2           ; If different, we have result
CMP R1, R3      ; If high bytes equal, compare low
; Flags now reflect comparison
; For R0:R1 < R2:R3: C=1 after final comparison
; For R0:R1 == R2:R3: Z=1 after final comparison
```

### Shift Left 16-bit (Multiply by 2)

```assembly
; Shift R0:R1 left by 1 bit
CMP R0, R0      ; Clear carry (C=0)
SHL R1          ; Shift low byte
SHL R0          ; Shift high byte (includes carry from low)
```

### Shift Right 16-bit (Divide by 2)

```assembly
; Shift R0:R1 right by 1 bit (unsigned)
CMP R0, R0      ; Clear carry (C=0)
SHR R0          ; Shift high byte
SHR R1          ; Shift low byte (includes carry from high)
```

### Load 16-bit from Memory

```assembly
; Load 16-bit value from address in R4:R5 to R0:R1
LOAD R0, R4     ; Load high byte
INC R5          ; Increment address low byte
JNC 2           ; If no carry, skip next instruction
INC R4          ; Handle carry to high byte
LOAD R1, R4     ; Load low byte
```

Alternative using stack (works for any number of bytes):

```assembly
; Load multiple bytes from address in R4:R5 to R0:R1
SWAP R14, R4    ; Temporarily use R4:R5 as stack pointer
SWAP R15, R5
POP R0, R1      ; Pop bytes into R0, R1 (auto-increments address)
SWAP R14, R4    ; Restore stack pointer
SWAP R15, R5
```

### Store 16-bit to Memory

```assembly
; Store R0:R1 to address in R4:R5
STOR R0, R4     ; Store high byte
INC R5          ; Increment address
JNC 2           ; If no carry, skip next instruction
INC R4
STOR R1, R4     ; Store low byte
```

(Using `PUSH` in this case gets more complex because it adjusts the stack pointer before storing, requiring you to adjust the target address first.)

### 16-bit Loop Counter

```assembly
; Count from 0 to 1000 ($03E8)
LDI0 $00        ; Counter high = 0
LDI1 $00        ; Counter low = 0
LDI2 $03        ; Limit high = 3
LDI3 $E8        ; Limit low = 232
loop:
  ; ... loop body ...

  ; Increment counter
  INC R1
  JNC 2
  INC R0

  ; Compare with limit
  CMP R0, R2    ; Compare high bytes
  JNZ loop      ; If different, continue
  CMP R1, R3    ; Compare low bytes
  JNZ loop      ; If different, continue

; Done
```

---

## 16-bit Signed Values

16-bit signed values use two's complement:
- Range: -32768 ($8000) to +32767 ($7FFF)
- Bit 15 (bit 7 of high byte) is the sign bit

### Load 16-bit Signed Values

```assembly
LDI0 $7F        ; +32767 ($7FFF)
LDI1 $FF

LDI2 $80        ; -32768 ($8000)
LDI3 $00

LDI4 $FF        ; -1 ($FFFF)
LDI5 $FF
```

### Negate 16-bit Value

```assembly
; Negate R0:R1 (R0:R1 = -R0:R1)
NOT R0          ; Complement high byte
NOT R1          ; Complement low byte
INC R1          ; Add 1 to complete two's complement
JNC 2           ; If no carry, done
INC R0          ; Propagate carry to high byte
```

### 16-bit Absolute Value

```assembly
; R0:R1 = abs(R0:R1)
TEST R0, R0     ; Check sign bit
JNN positive    ; If positive, skip
NOT R0          ; Negate: two's complement
NOT R1
INC R1
JNC 2
INC R0
positive:
```

### Sign Extension from 8-bit to 16-bit

```assembly
; Sign-extend R0 (8-bit signed) to R0:R1 (16-bit signed)
MOV R1, R0      ; Copy to low byte
TEST R0, R0     ; Check if negative
LDI0 $00        ; Assume positive
JNN 2           ; If positive, high byte = $00
LDI0 $FF        ; If negative, high byte = $FF
; Now R0:R1 is sign-extended 16-bit value
```

---

## Miscellaneous Idioms

### Print a String from Memory

```assembly
; Print null-terminated string at address in R2:R3
; Assumes string is in memory
LDI2 $03        ; Point to string at $0300
LDI3 $00
print_loop:
LOAD R0, R2     ; Load character
TEST R0, R0     ; Check if null terminator
JZ done         ; If zero, exit
PRINT R0        ; Print character
INC R3          ; Increment pointer low byte
JNC print_loop  ; If no carry, continue
INC R2          ; Increment pointer high byte
JMP print_loop  ; Continue loop
done:
HLT
```

### Print Hexadecimal Byte

```assembly
; Print R0 as two hex digits
MOV R1, R0
LDI2 $10
DIV R1, R2        ; R1 = high nibble, R2 = low nibble (remainder)

; Save low nibble for later
PUSH R2, R2

; Convert high nibble to ASCII hex
LDI2 $09
CMP R1, R2
JC is_digit       ; If <= 9, it's a digit
LDI2 $37          ; 'A' - 10
ADD R1, R2
JMP print1
is_digit:
LDI2 $30          ; '0'
ADD R1, R2
print1:
MOV R0, R1
PRINT R0

; Print low nibble
POP R0, R0        ; Retrieve low nibble from stack
LDI2 $09
CMP R0, R2
JC is_digit2
LDI2 $37
ADD R0, R2
JMP print2
is_digit2:
LDI2 $30
ADD R0, R2
print2:
PRINT R0
```

### Print Decimal Byte (0-255)

```assembly
; Print R0 as decimal (up to 3 digits)
; This is a simplified version that prints 3 digits always

; Hundreds digit
LDI1 $64        ; 100
LDI2 $00        ; Counter
div100:
  CMP R0, R1    ; Compare with 100
  JC print_hundreds
  SUB R0, R1    ; Subtract 100
  INC R2        ; Count
  JMP div100
print_hundreds:
  LDI3 $30      ; ASCII '0'
  ADD R2, R3
  MOV R4, R0    ; Save remainder
  MOV R0, R2
  PRINT R0      ; Print hundreds
  MOV R0, R4    ; Restore remainder

; Tens digit
LDI1 $0A        ; 10
LDI2 $00        ; Counter
div10:
  CMP R0, R1
  JC print_tens
  SUB R0, R1
  INC R2
  JMP div10
print_tens:
  LDI3 $30      ; ASCII '0'
  ADD R2, R3
  MOV R4, R0    ; Save remainder
  MOV R0, R2
  PRINT R0      ; Print tens
  MOV R0, R4    ; Restore remainder

; Ones digit
LDI1 $30        ; ASCII '0'
ADD R0, R1
PRINT R0        ; Print ones
```

Alternative using division and stack (variable digits):

```assembly
; Print R0 as decimal (1-3 digits, no leading zeros)
; Use R1 for division, R2 for digit count
LDI2 $00        ; Digit count = 0

; Handle special case: zero
TEST R0, R0
JNZ convert_loop
LDI0 $30        ; Print '0'
PRINT R0
JMP done

convert_loop:
  ; While R0 > 0, extract digits
  TEST R0, R0
  JZ print_digits

  ; Divide by 10
  LDI1 $0A
  DIV R0, R1      ; R0 = quotient, R1 = remainder (digit)

  ; Convert digit to ASCII and push
  LDI3 $30
  ADD R1, R3
  PUSH R1, R1     ; Push ASCII digit onto stack
  INC R2          ; Count++

  JMP convert_loop

print_digits:
  ; Pop and print R2 digits
  TEST R2, R2
  JZ done

  POP R0, R0
  PRINT R0
  DEC R2

  JMP print_digits

done:
```

### Read and Echo Input

```assembly
; Echo characters from input to output until newline
echo_loop:
  INPUT R0        ; Read character (sets Z if R0 == 0)
  JZ echo_loop    ; If no input available, try again

  LDI1 $0A        ; Check for newline
  CMP R0, R1
  JZ done

  PRINT R0        ; Echo character
  JMP echo_loop
done:
```

### Memory Fill

```assembly
; Fill memory from R2:R3 (start) up to R4:R5 (end) with value in R0
fill_loop:
  ; Check if done
  CMP R2, R4      ; Compare high bytes
  JNZ not_done
  CMP R3, R5      ; Compare low bytes
  JZ done
not_done:
  ; Store value
  STOR R0, R2

  ; Increment pointer
  INC R3
  JNC fill_loop
  INC R2
  JMP fill_loop
done:
```

### Memory Copy

```assembly
; Copy from R2:R3 (source) to R4:R5 (dest), R6 (up to 255) bytes
; Assumes R6 > 0
copy_loop:
  LOAD R0, R2     ; Load from source
  STOR R0, R4     ; Store to dest

  ; Increment source
  INC R3
  JNC 2
  INC R2

  ; Increment dest
  INC R5
  JNC 2
  INC R4

  ; Decrement count
  DEC R6
  JNZ copy_loop
```

### Compare Memory Blocks

```assembly
; Compare R6 bytes at R2:R3 with bytes at R4:R5
; Returns: Z=1 if equal, Z=0 if different
compare_loop:
  TEST R6, R6     ; Check if done
  JZ done         ; If so, exit with Z=0

  LOAD R0, R2     ; Load from first block
  LOAD R1, R4     ; Load from second block
  CMP R0, R1      ; Compare
  JNZ done        ; If different, exit with Z=1

  ; Increment pointers
  INC R3
  JNC 2
  INC R2
  INC R5
  JNC 2
  INC R4

  DEC R6
  JMP compare_loop
done:
```

### Find Character in String

```assembly
; Search for character in R1 in null-terminated string at R2:R3
; Returns: Z=1 if found (address in R2:R3), Z=0 if not found
search_loop:
  LOAD R0, R2     ; Load character
  TEST R0, R0     ; Check for null
  JZ not_found

  CMP R0, R1      ; Compare with search char
  JZ found

  ; Increment pointer
  INC R3
  JNC search_loop
  INC R2
  JMP search_loop

found:
  ; Z=1, R2:R3 points to found character
  JMP done
not_found:
  ; Z=0 (was set by TEST R0, R0 finding zero)
  ; Need to clear Z to indicate not found
  LDI0 $01        ; Load non-zero
  TEST R0, R0     ; This clears Z
done:
```

### Random Number Generator (Simple PRNG)

```assembly
; Linear Congruential Generator
; R0 = seed (state), updates R0 with new random value
; Formula: R0 = (R0 * 5 + 3) & 0xFF

; Multiply by 5 (4 + 1)
MOV R1, R0      ; Save original
SHL R0          ; *2
SHL R0          ; *4
ADD R0, R1      ; *4 + 1 = *5

; Add 3
LDI1 $03
ADD R0, R1

; Result is already modulo 256 (8-bit)
```

### Checksum Calculation

```assembly
; Calculate 8-bit sum checksum of R6 bytes at R2:R3
; Result in R0
LDI0 $00        ; Clear checksum
checksum_loop:
  TEST R6, R6   ; Check if done
  JZ done

  LOAD R1, R2   ; Load byte
  ADD R0, R1    ; Add to checksum (overflow ignored)

  ; Increment pointer
  INC R3
  JNC no_carry
  INC R2
no_carry:

  DEC R6
  JMP checksum_loop
done:
```

---

## Notes

- All register pairs for 16-bit values use big-endian format (high byte in lower-numbered register)
- The carry flag is essential for multi-byte arithmetic
- Always clear carry before shift operations if you don't want rotation
- The TEST instruction preserves the carry flag, unlike AND/OR/XOR
- Memory addresses must be even for instruction alignment
- The PC advances by 2 for all instructions (no variable-length instructions)

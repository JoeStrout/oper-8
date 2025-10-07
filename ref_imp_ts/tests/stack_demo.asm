; Stack operations demonstration
; Shows PUSH and POP with multiple registers
; Demonstrates: stack pointer setup, PUSH, POP

.org 0x200

main:
  ; Initialize stack pointer at 0x0400
  LDI14 0x04
  LDI15 0x00

  ; Load some values
  LDI0 'A'
  LDI1 'B'
  LDI2 'C'

  ; Push them onto stack
  PUSH R0, R2     ; Push R0, R1, R2

  ; Clear registers
  LDI0 0
  LDI1 0
  LDI2 0

  ; Pop them back
  POP R0, R2      ; Pop into R0, R1, R2

  ; Print to verify
  PRINT R0        ; Should print 'A'
  PRINT R1        ; Should print 'B'
  PRINT R2        ; Should print 'C'

  LDI0 '\n'
  PRINT R0

  HLT

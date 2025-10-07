; Subroutine demonstration with CALL/RET
; Demonstrates: CALL, RET, stack pointer

.org 0x200

main:
  ; Initialize stack pointer
  LDI14 0x04
  LDI15 0x00

  ; Call a simple subroutine
  LDI0 'A'
  CALL print_char
  CALL print_char
  CALL print_char
  LDI0 '!'
  CALL print_char

  LDI0 '\n'
  PRINT R0

  HLT

; Subroutine: print character in R0.
print_char:
  PRINT R0
  RET

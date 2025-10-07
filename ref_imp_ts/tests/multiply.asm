; Multiplication demonstration: 7 × 8 = 56
; Demonstrates: MUL instruction, 16-bit results, subroutines

.org 0x200

main:
  ; Initialize stack pointer
  LDI14 0x04
  LDI15 0x00

  ; Print "7 x 8 = "
  LDI0 >message
  LDI1 <message

print_msg:
  LOAD R2, R0
  TEST R2, R2
  JZ do_multiply
  PRINT R2
  INC R1
  JNC print_msg
  INC R0
  JMP print_msg

do_multiply:
  LDI0 7
  LDI1 8
  MUL R0, R1      ; R0:R1 = 7 × 8 = 56 (R0=0, R1=56)

  ; Print result (R1 contains low byte)
  MOV R0, R1
  CALL print_decimal

  ; Print newline
  LDI0 '\n'
  PRINT R0

  HLT

message:
.data '7 x 8 = ' 0

; Subroutine: print decimal number
; Reads: R0 (number to print, 0-255)
; Clobbers: R0, R1, R2, R3
print_decimal:
  LDI2 0          ; Digit count = 0

  ; Handle special case: zero
  TEST R0, R0
  JNZ pd_convert
  LDI0 '0'
  PRINT R0
  RET

pd_convert:
  ; While R0 > 0, extract digits
  TEST R0, R0
  JZ pd_print

  ; Divide by 10
  LDI1 10
  DIV R0, R1      ; R0 = quotient, R1 = remainder (digit)

  ; Convert digit to ASCII and push
  LDI3 '0'
  ADD R1, R3
  PUSH R1, R1     ; Push ASCII digit onto stack
  INC R2          ; Count++

  JMP pd_convert

pd_print:
  ; Pop and print R2 digits
  TEST R2, R2
  JZ pd_done

  POP R0, R0
  PRINT R0
  DEC R2

  JMP pd_print

pd_done:
  RET


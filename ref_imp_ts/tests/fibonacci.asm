; Fibonacci sequence - first 10 numbers
; Demonstrates: 8-bit arithmetic, loops, subroutines

.org 0x200

main:
  ; Initialize stack pointer
  LDI14 0x04
  LDI15 0x00

  LDI0 0          ; F(0) = 0
  LDI1 1          ; F(1) = 1
  LDI2 10         ; Counter (10 numbers)

fib_loop:
  ; Print current Fibonacci number (in R0)
  PUSH R0, R2     ; Save R0, R1, R2
  CALL print_decimal
  POP R0, R2      ; Restore R0, R1, R2

  ; Print newline
  LDI3 '\n'
  PRINT R3

  ; Calculate next: R0, R1 = R1, R0+R1
  MOV R3, R0      ; Save R0
  MOV R0, R1      ; R0 = R1
  ADD R1, R3      ; R1 = R1 + old R0

  ; Decrement counter
  DEC R2
  JNZ fib_loop

  HLT

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

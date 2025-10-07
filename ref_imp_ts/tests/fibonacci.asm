; Fibonacci sequence - first 7 numbers
; Demonstrates: 8-bit arithmetic, loops

.org 0x200

main:
  LDI0 0          ; F(0) = 0
  LDI1 1          ; F(1) = 1
  LDI2 7          ; Counter (7 numbers)

fib_loop:
  ; Print current Fibonacci number (in R0)
  MOV R3, R0
  LDI4 '0'
  ADD R3, R4
  PRINT R3

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

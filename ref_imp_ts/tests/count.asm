; Count from 1 to 9
; Demonstrates: loops, arithmetic, decimal output

.org 0x200

main:
  LDI0 1          ; Counter starts at 1
  LDI1 10         ; Limit

count_loop:
  ; Print counter value as decimal
  MOV R2, R0      ; Save counter

  ; Convert to ASCII and print
  LDI3 '0'
  ADD R2, R3
  PRINT R2

  ; Print newline
  LDI2 '\n'
  PRINT R2

  ; Increment and check
  INC R0
  CMP R0, R1
  JC count_loop    ; Loop if not done

done:
  HLT

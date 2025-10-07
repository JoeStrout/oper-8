; Hexdump - print first 16 bytes of memory in hex
; Demonstrates: DIV for hex conversion, memory reading

.org 0x200

main:
  LDI0 0x02       ; Start address high
  LDI1 0x00       ; Start address low
  LDI2 16         ; Counter

dump_loop:
  ; Load byte
  LOAD R3, R0

  ; Print high nibble
  MOV R4, R3
  LDI5 16
  DIV R4, R5      ; R4 = high nibble, R5 = low nibble

  ; Convert high nibble to hex ASCII
  LDI6 9
  CMP R4, R6
  JC digit1
  LDI6 55         ; 'A' - 10
  ADD R4, R6
  JMP print1
digit1:
  LDI6 '0'
  ADD R4, R6
print1:
  PRINT R4

  ; Print low nibble
  LDI6 9
  CMP R5, R6
  JC digit2
  LDI6 55
  ADD R5, R6
  JMP print2
digit2:
  LDI6 '0'
  ADD R5, R6
print2:
  PRINT R5

  ; Print space
  LDI4 ' '
  PRINT R4

  ; Increment address
  INC R1
  JNC no_carry
  INC R0
no_carry:

  ; Decrement counter
  DEC R2
  JNZ dump_loop

  ; Print newline
  LDI0 '\n'
  PRINT R0

  HLT

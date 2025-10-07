; Hexdump - print first 16 bytes of memory in hex
; Demonstrates: DIV for hex conversion, memory reading, subroutines

.org 0x200

main:
  ; Initialize stack pointer
  LDI14 0x04
  LDI15 0x00

  LDI0 0x02       ; Start address high
  LDI1 0x00       ; Start address low
  LDI2 16         ; Counter (how many bytes to show)
  LDI8 16         ; Constant 16 (hexadecimal base)

dump_loop:
  ; Load byte
  LOAD R3, R0

  ; Print high nibble
  MOV R4, R3
  DIV R4, R8      ; R4 = high nibble, R5 = low nibble
  CALL print_hex_digit

  ; Print low nibble
  MOV R4, R5
  CALL print_hex_digit

  ; Print space
  LDI4 ' '
  PRINT R4

  ; Increment address
  INC R1
  JNC 2
  INC R0

  ; Decrement counter
  DEC R2
  JNZ dump_loop

  ; Print newline
  LDI0 '\n'
  PRINT R0

  HLT

; Subroutine: print hex digit
; Reads: R4 (digit to print, 0-15)
; Clobbers: R4, R6
print_hex_digit:
  LDI6 10
  CMP R4, R6
  JC hex_digit    ; Jump if R4 < 10
  LDI6 55         ; 'A' - 10
  ADD R4, R6
  JMP hex_print
hex_digit:
  LDI6 '0'
  ADD R4, R6
hex_print:
  PRINT R4
  RET

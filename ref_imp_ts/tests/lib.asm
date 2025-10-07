; A collection of "library" routines for doing various useful things.


.org 0x200
; Quick test program:
  ; Initialize stack pointer
  LDI14 0x04
  LDI15 0x00

  LDI0 >lib_test_msg
  LDI1 <lib_test_msg
  LDI2 >lib_print_pstr
  LDI3 <lib_print_pstr
  CALLL R2, R3

  LDI0 '\n'
  PRINT R0
  HLT

lib_test_msg:
.data p'This is a test.'

.org 0xF000

; lib_print_pstr: Print a Pascal string.
; Args:
;    R0: high byte of string address
;    R1: low byte of string address
; Side-effects: None (except for printing).
lib_print_pstr:
  PUSH R0, R4       ; save R0-R4
  LOAD R3, R0       ; get string length
  ; Advance pointer past length byte
  INC R1
  JNC 2
  INC R0
lib_print_pstr_loop:
  TEST R3, R3       ; if R3==0, done
  JZ lib_print_pstr_done
  ; Load and print character
  LOAD R4, R0
  PRINT R4
  ; Increment pointer
  INC R1
  JNC 2
  INC R0
  DEC R3
  JMP lib_print_pstr_loop
lib_print_pstr_done:
  POP R0, R4        ; restore R0-R4
  RET


; Multiplication demonstration: 7 × 8 = 56
; Demonstrates: MUL instruction, 16-bit results

.org 0x200

main:
  ; Print "7 x 8 = "
  LDI0 0x02
  LDI1 $28

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
  MOV R2, R1
  LDI3 10
  DIV R2, R3      ; R2 = tens, R3 = ones

  ; Print tens
  LDI4 '0'
  ADD R2, R4
  PRINT R2

  ; Print ones
  ADD R3, R4
  PRINT R3

  ; Print newline
  LDI0 '\n'
  PRINT R0

  HLT

message:
.data '7 x 8 = ' 0

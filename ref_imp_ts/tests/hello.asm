; Hello, World! program for OPER-8
; Demonstrates: .org, .data, labels, string printing

.org 0x200

main:
  LDI0 >message   ; High byte of message address
  LDI1 <message   ; Low byte of message address

print_loop:
  LOAD R2, R0     ; Load character from [R0:R1]
  TEST R2, R2     ; Check if null terminator
  JZ done         ; Exit if zero

  PRINT R2        ; Print character

  INC R1          ; Increment address (low byte)
  JNC print_loop  ; Continue if no carry
  INC R0          ; Carry to high byte
  JMP print_loop

done:
  HLT

; String data
message:
.data 'Hello, World!\n' 0

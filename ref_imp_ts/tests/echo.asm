; Echo program for OPER-8
; Demonstrates: INPUT instruction, character I/O
; Echoes characters until newline is received

.org 0x200

main:
  LDI0 >prompt    ; Print prompt (high byte)
  LDI1 <prompt    ; Prompt address (low byte)

print_prompt:
  LOAD R2, R0
  TEST R2, R2
  JZ echo_loop
  PRINT R2
  INC R1
  JNC print_prompt
  INC R0
  JMP print_prompt

echo_loop:
  INPUT R0        ; Read character (sets Z if R0 == 0)
  JZ echo_loop    ; If no input available, try again

  LDI1 '\n'       ; Check for newline (LF)
  CMP R0, R1
  JZ done

  LDI1 '\r'       ; Check for carriage return (CR)
  CMP R0, R1
  JZ done

  PRINT R0        ; Echo character
  JMP echo_loop

done:
  PRINT R1        ; Print final newline
  HLT

prompt:
.data 'Type something: ' 0

; Bubble sort demonstration
; Sorts 5 numbers in memory and prints them
; Demonstrates: memory operations, nested loops, SWAP

.org 0x200

main:
  ; Sort the array at 'numbers'
  LDI0 5          ; Array length
  DEC R0          ; Outer loop count (n-1)
  MOV R10, R0     ; Save in R10

outer_loop:
  LDI11 0         ; Inner loop counter
  LDI0 0x02       ; Array address high
  LDI1 $3C        ; Array address low

inner_loop:
  ; Load current and next elements
  LOAD R2, R0     ; Current element
  INC R1          ; Point to next
  JNC no_carry1
  INC R0
no_carry1:
  LOAD R3, R0     ; Next element

  ; Compare and swap if needed
  CMP R2, R3      ; Compare current with next
  JNC no_swap     ; Skip if current <= next

  ; Swap elements
  DEC R1          ; Back to current
  JNC no_borrow
  DEC R0
no_borrow:
  STOR R3, R0     ; Store next value at current
  INC R1
  JNC no_carry2
  INC R0
no_carry2:
  STOR R2, R0     ; Store current value at next

no_swap:
  INC R11         ; Increment inner counter
  MOV R2, R11
  CMP R2, R10     ; Compare with outer count
  JC inner_loop   ; Continue if less

  ; Decrement outer loop
  DEC R10
  JNZ outer_loop

  ; Print sorted array
  LDI0 0x02
  LDI1 $3C
  LDI2 5

print_loop:
  LOAD R3, R0
  LDI4 '0'
  ADD R3, R4
  PRINT R3
  LDI3 ' '
  PRINT R3

  INC R1
  JNC no_carry3
  INC R0
no_carry3:
  DEC R2
  JNZ print_loop

  LDI0 '\n'
  PRINT R0
  HLT

numbers:
.data 5 2 8 1 9

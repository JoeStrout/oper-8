; Very simple pseudo-random number generator.
; Prints several random characters.

.org 0x200
LDI0 42
LDI9 5
loop:
LDI1 5
MUL R0, R1
MOV R0, R1
LDI1 3
ADD R0, R1
PRINT R0
LDI1 ' '
PRINT R1
DEC R9
JNZ loop
LDI0 '\n'
PRINT R0
HLT

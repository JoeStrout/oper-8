# OPER-8 Fault Handling

## Overview

The OPER-8 CPU provides a simple, lightweight fault handling mechanism. When a fault occurs, the CPU:

1. Stores a fault code in **R0**
2. Stores the current PC (program counter) in **$00FC-$00FD** (big-endian)
3. Jumps to the address found in **$00FE-$00FF** (big-endian)

This design allows programs to install custom fault handlers for debugging and error reporting, while providing sensible default behavior for simple programs.

## Default Fault Handling

### Memory Initialization

On system reset or program load, memory should be initialized as follows:

1. Fill all memory with **$00** (NOP instructions)
2. Write **$FF FF** to **$FFFE-$FFFF** (HALT instruction with $FF operand)
3. Write **$FF FE** to **$00FE-$00FF** (fault handler vector points to $FFFE)

### Backstop Behavior

The HALT instruction at **$FFFE** serves two purposes:

1. **Default fault handler**: Any fault jumps here and halts execution
2. **Runaway program backstop**: Programs that run past their intended end will execute NOPs until reaching $FFFE, then halt gracefully

This design ensures that both faults and runaway execution result in a safe halt rather than unpredictable behavior.

## Fault Vector Locations

| Address | Purpose | Default Value |
|---------|---------|---------------|
| $00FC-$00FD | Fault PC storage | $0000 |
| $00FE-$00FF | Fault handler vector | $FFFE |

**Note:** The fault PC storage at $00FC-$00FD contains the address of the instruction that caused the fault (or the next instruction, for asynchronous faults). This allows handlers to inspect the faulting instruction and display useful diagnostic information.

## Installing a Custom Fault Handler

To install a custom fault handler:

1. Write your handler code at any convenient address
2. Update $00FE-$00FF to point to your handler's start address
3. Your handler will receive:
   - **R0**: Fault code (see table below)
   - **$00FC-$00FD**: PC value at time of fault

### Example Handler Installation

```
; Install handler at $2000
LDI0 $20            ; Load $20 into R0
STORZ $FE           ; Store to $00FE (high byte of handler address)
LDI0 $00            ; Load $00 into R0
STORZ $FF           ; Store to $00FF (low byte of handler address)
```

### Handler Responsibilities

A fault handler should:

1. Inspect R0 to determine fault type
2. Optionally inspect $00FC-$00FD to see where fault occurred
3. Optionally read faulting instruction using PC value
4. Display error message or take appropriate action
5. Either HALT or jump to recovery code (cannot resume faulted instruction)

**Important:** Handlers cannot resume execution at the fault location. Faults indicate programming errors or exceptional conditions that require termination or recovery, not continuation.

## Fault Codes

The following fault codes are stored in R0 when a fault occurs:

| Code | Name | Description |
|------|------|-------------|
| $00 | FAULT_NONE | No fault (should never appear in R0) |
| $01 | FAULT_INVALID_OPCODE | Unrecognized or unimplemented opcode |
| $02 | FAULT_DIV_ZERO | Division by zero (DIV instruction with Ry=$00) |
| $03 | FAULT_MISALIGNED_PC | PC became odd (instructions must start on even addresses) |
| $04 | FAULT_MISALIGNED_INSTRUCTION | Attempted to execute instruction at odd address |
| $05 | FAULT_STACK_OVERFLOW | Stack pointer wrapped past $0000 (SP underflow) |
| $06 | FAULT_STACK_UNDERFLOW | Stack pointer exceeded maximum (implementation-defined) |
| $07 | FAULT_WRITE_PROTECTED | Attempted to write to read-only memory region |
| $08 | FAULT_READ_PROTECTED | Attempted to read from protected memory region |
| $09-$0F | (Reserved) | Reserved for future architectural faults |
| $10-$FF | (User-defined) | Available for implementation-specific or software faults |

### Fault Code Details

**$01 - FAULT_INVALID_OPCODE**
- Triggered when CPU encounters an undefined opcode
- PC points to the invalid instruction
- Allows detection of corrupted code or incorrect jumps

**$02 - FAULT_DIV_ZERO**
- Triggered by DIV instruction when Ry (divisor) is $00
- PC points to the DIV instruction
- Alternative to undefined division behavior

**$03 - FAULT_MISALIGNED_PC**
- Triggered when PC becomes odd through any means
- Can occur from corrupted stack return, malformed jump target, etc.
- PC value in $00FC-$00FD is the misaligned value

**$04 - FAULT_MISALIGNED_INSTRUCTION**
- Triggered when attempting to execute from odd address
- Similar to FAULT_MISALIGNED_PC but detected at execution time
- May be redundant depending on implementation

**$05 - FAULT_STACK_OVERFLOW**
- Triggered when stack operations cause SP to wrap past $0000
- Indicates stack collision with low memory
- Detection is optional (implementation-dependent)

**$06 - FAULT_STACK_UNDERFLOW**
- Triggered when stack operations exceed maximum depth
- Maximum may be implementation-defined or unlimited
- Detection is optional (implementation-dependent)

**$07 - FAULT_WRITE_PROTECTED**
- Triggered when attempting to write to read-only memory
- Useful if high memory ($FF00-$FFFF) is ROM or protected
- Requires memory protection hardware (optional feature)

**$08 - FAULT_READ_PROTECTED**
- Triggered when attempting to read from protected memory
- Less common than write protection
- Requires memory protection hardware (optional feature)

## Implementation Considerations

### Mandatory Faults

Implementations **MUST** support:
- $01 (FAULT_INVALID_OPCODE)
- $02 (FAULT_DIV_ZERO)

### Optional Faults

Implementations **MAY** support:
- $03/$04 (alignment faults) - recommended for debugging
- $05/$06 (stack faults) - useful but may impact performance
- $07/$08 (memory protection) - for systems with ROM or protected regions

### Fault Handler Re-entrancy

If a fault occurs **during fault handler execution**, behavior is undefined. Implementations may:
- Halt immediately
- Reset the system
- Jump to handler again (infinite loop risk)

Handlers should be written carefully to avoid triggering faults.

### Performance

Fault checking may impact CPU performance. Implementations may:
- Check only on specific instructions (DIV for division by zero)
- Check only in debug/safe mode
- Always check (safest but slowest)

## Design Rationale

### Why R0?

R0 is already special for zero-page operations (LOADZ, STORZ, LDI0). Using R0 for fault codes reinforces its role as a "special-purpose" register while keeping the design simple. The tradeoff is that R0's pre-fault value is lost, but this is acceptable since faults are non-resumable.

### Why Not Save More State?

Saving all registers, flags, and PC would require significant stack space and complexity. Since faults indicate programming errors (not recoverable exceptions like page faults in larger systems), the minimal state (R0 + PC) provides enough information for diagnostics without overcomplicating the design.

### Why Single Vector?

A single fault vector keeps the design simple and uses minimal zero-page space. Handlers can dispatch based on the R0 fault code if different handling is needed. More complex systems might use a vector table ($00F0-$00FF for 8 fault types), but this is left as a possible future extension.

### Why $FFFE for Default Handler?

Placing the default HALT at the end of memory serves as both a fault handler and a "backstop" for runaway programs. This dual purpose is elegant and memorable, and leaves low memory (including page $01) available for user code and stack.

## Future Extensions

Possible enhancements (not currently specified):

- **Interrupt handling**: Similar mechanism with different vector ($00FA-$00FB?)
- **Multiple fault vectors**: Use $00F0-$00FF as 8-entry vector table
- **Fault masking**: Ability to disable certain fault types
- **Nested fault handling**: Save fault state to stack for re-entrant handlers

These extensions would maintain backward compatibility with the current simple design.

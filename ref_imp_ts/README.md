# OPER-8 Reference Implementation (TypeScript)

This is a reference implementation of the OPER-8 CPU in TypeScript. It can run both as a command-line tool and in the browser.

## Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start -- <program.bin>
```

## Usage

**Note:** After making code changes, rebuild with `npm run build` before running.

### Run a program

```bash
npm start -- <program.bin>
npm start -- <program.asm>
```

### Interactive mode (REPL)

```bash
npm start -- -i
```

Commands available in interactive mode:
- `load <file>` - Load binary file into memory
- `run [steps]` - Run CPU (max steps, default 100000; use 0 for unlimited)
- `step` - Execute one instruction
- `reset` - Reset CPU
- `regs` - Show registers
- `mem <addr>` - Show memory at address (hex)
- `poke <addr> <val>` - Write byte to memory (hex)
- `quit` - Exit

### Interactive mode with program loaded

```bash
npm start -- -i <program.bin>
npm start -- -i <program.asm>
```

Loads and assembles the program but drops into interactive mode for debugging.

### Debug mode (step through)

```bash
npm start -- -d <program.bin>
```

## Development

```bash
# Run directly with ts-node (no build required)
npm run dev -- -i
```

## Project Structure

- `src/cpu.ts` - Core CPU emulator (platform-independent)
- `src/cli.ts` - Command-line interface
- `dist/` - Compiled JavaScript output

## Creating Programs

### Assembly Language

The assembler supports:
- Labels and label references
- Multiple literal formats: decimal, hex (`$6E`, `0x6E`), binary (`0b1110`), character (`'a'`, `'\n'`)
- Directives: `.org <addr>` to set assembly location, `.data` for data bytes
- High/low byte operators: `>label` and `<label` for extracting address bytes
- Comments: `;` or `//`

Example assembly program (hello.asm):

```assembly
.org 0x200

main:
  LDI0 >message   ; High byte of message address
  LDI1 <message   ; Low byte of message address

print_loop:
  LOAD R2, R0
  TEST R2, R2
  JZ done
  PRINT R2
  INC R1
  JNC print_loop
  INC R0
  JMP print_loop

done:
  HLT

message:
.data 'Hello, World!\n' 0
```

See the `tests/` directory for more example programs.

### Binary Programs

Programs are raw binary files. Each instruction is 2 bytes (opcode + operand).

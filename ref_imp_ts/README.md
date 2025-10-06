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

### Run a program

```bash
node dist/cli.js program.bin
```

### Interactive mode (REPL)

```bash
node dist/cli.js -i
```

Commands available in interactive mode:
- `load <file>` - Load binary file into memory
- `run [steps]` - Run CPU (max steps, default 100000)
- `step` - Execute one instruction
- `reset` - Reset CPU
- `regs` - Show registers
- `mem <addr>` - Show memory at address (hex)
- `poke <addr> <val>` - Write byte to memory (hex)
- `quit` - Exit

### Debug mode (step through)

```bash
node dist/cli.js -d program.bin
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

## Creating Test Programs

Programs are raw binary files. Each instruction is 2 bytes (opcode + operand).

Example: Simple program that outputs 'H' and halts

```
12 48    ; LDI0 'H' ($48)
23 FA    ; STORZ $FA (output port)
FF FF    ; HLT
```

Save as hex and convert to binary, or write directly with a hex editor.

## Memory-Mapped I/O

- `$00FA` - Character output (write-only)
- `$00FB` - Character input (read-only, returns $00 if none available)
- `$00FC-$00FD` - Fault PC storage
- `$00FE-$00FF` - Fault handler vector (default: $FFFE)

## Next Steps

- Add assembler to create programs from assembly source
- Add disassembler for debugging
- Create web-based interface
- Add comprehensive test suite

#!/usr/bin/env node
/**
 * OPER-8 CPU Command-line Interface
 *
 * Usage:
 *   oper8 <program.bin>           Run a binary program
 *   oper8 -i                      Interactive mode (REPL)
 *   oper8 -d <program.bin>        Debug mode (step through)
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { CPU } from './cpu.js';
import { assemble, disassemble, assembleProgram, assembleFile, AssemblerError } from './assembler.js';

// Input buffer for character I/O
let inputBuffer: number[] = [];

/**
 * Create CPU with I/O handlers
 */
function createCPU(): CPU {
  const cpu = new CPU();

  // Character output handler
  cpu.onCharOutput = (char: number) => {
    process.stdout.write(String.fromCharCode(char));
  };

  // Character input handler
  cpu.onCharInput = () => {
    return inputBuffer.shift() || 0;
  };

  return cpu;
}

/**
 * Load and run a binary or assembly file
 */
async function runProgramOrAssembly(filename: string, debug: boolean = false): Promise<void> {
  try {
    const isAssembly = filename.toLowerCase().endsWith('.asm');
    const cpu = createCPU();
    let program: Uint8Array;
    let startAddr: number;

    if (isAssembly) {
      // Assemble the file
      const content = fs.readFileSync(filename, 'utf-8');
      console.log(`Assembling ${filename}...`);
      const { bytes, startAddr: addr } = assembleFile(content);
      program = bytes;
      startAddr = addr;
      console.log(`Assembled ${program.length} bytes, start address: $${startAddr.toString(16).toUpperCase().padStart(4, '0')}`);

      // Load into memory at the start address
      cpu.memory.set(program, startAddr);
      cpu.pc = startAddr;
    } else {
      // Load binary file
      program = new Uint8Array(fs.readFileSync(filename));
      cpu.loadProgram(program);
      startAddr = cpu.pc;
      console.log(`Loaded ${program.length} bytes from ${filename}`);
    }

    console.log('Starting execution...\n');

    if (debug) {
      debugProgram(cpu);
    } else {
      // Set up stdin to feed input buffer for programs that use INPUT
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (key: string) => {
        // Handle Ctrl+C
        if (key === '\u0003') {
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.exit(0);
        }
        // Add each character to the input buffer
        for (let i = 0; i < key.length; i++) {
          inputBuffer.push(key.charCodeAt(i));
        }
      });

      try {
        // Run in chunks to allow I/O events to be processed
        let totalSteps = 0;
        const runAsync = async () => {
          while (!cpu.halted) {
            // Run 1000 steps at a time, then yield to event loop
            const steps = cpu.run(1000);
            totalSteps += steps;
            if (steps < 1000) break; // Halted
            await new Promise(resolve => setImmediate(resolve));
          }
          return totalSteps;
        };

        const steps = await runAsync();
        console.log(`\nExecution complete. Total steps: ${steps}`);
        console.log(`Halted: ${cpu.halted}`);
        showCPUState(cpu);
      } catch (err) {
        // If there's a fault during execution, drop into interactive mode
        if (err instanceof Error && err.message.includes('fault')) {
          console.error(`\n${err.message}`);
          console.log('\nDropping into interactive mode...\n');
          interactive(cpu);
        } else {
          throw err;
        }
      } finally {
        // Restore stdin
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
      }
    }
  } catch (err) {
    if (err instanceof AssemblerError) {
      console.error(`Assembly Error: ${err.message}`);
      process.exit(1);
    } else if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

/**
 * Load and run a binary file (deprecated, use runProgramOrAssembly)
 */
async function runProgram(filename: string, debug: boolean = false): Promise<void> {
  await runProgramOrAssembly(filename, debug);
}

/**
 * Debug mode - step through execution
 */
function debugProgram(cpu: CPU): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function step(): void {
    showCPUState(cpu);
    const opcode = cpu.memory[cpu.pc];
    const operand = cpu.memory[cpu.pc + 1];
    console.log(`Next: [${toHex(cpu.pc, 4)}] ${toHex(opcode)} ${toHex(operand)}\n`);

    rl.question('Press Enter to step, q to quit: ', (answer) => {
      if (answer.trim().toLowerCase() === 'q') {
        rl.close();
        process.exit(0);
      }

      const running = cpu.step();
      if (!running) {
        console.log('\nCPU halted.');
        showCPUState(cpu);
        rl.close();
      } else {
        step();
      }
    });
  }

  step();
}

/**
 * Show CPU state
 */
function showCPUState(cpu: CPU): void {
  console.log('=== CPU State ===');
  const opcode = cpu.memory[cpu.pc];
  const operand = cpu.memory[cpu.pc + 1];
  const nextBytes = [cpu.memory[cpu.pc + 2], cpu.memory[cpu.pc + 3]];
  const instruction = disassemble(opcode, operand, nextBytes);
  console.log(`PC: ${toHex(cpu.pc, 4)}  Flags: Z=${b(cpu.flagZ)} C=${b(cpu.flagC)} N=${b(cpu.flagN)}  [${instruction}]`);
  console.log('Registers:');
  for (let i = 0; i < 16; i += 4) {
    const regs = [i, i + 1, i + 2, i + 3]
      .map(r => `R${(r.toString() + ":").padEnd(3, ' ')}${toHex(cpu.registers[r])}`)
      .join('  ');
    console.log(`  ${regs}`);
  }
  console.log();
}

/**
 * Load a program file and drop into interactive mode
 */
function loadProgramAndInteractive(filename: string): void {
  try {
    const isAssembly = filename.toLowerCase().endsWith('.asm');
    const cpu = createCPU();

    if (isAssembly) {
      // Assemble the file
      const content = fs.readFileSync(filename, 'utf-8');
      console.log(`Assembling ${filename}...`);
      const { bytes, startAddr } = assembleFile(content);
      console.log(`Assembled ${bytes.length} bytes, start address: $${startAddr.toString(16).toUpperCase().padStart(4, '0')}`);

      // Load into memory at the start address
      cpu.memory.set(bytes, startAddr);
      cpu.pc = startAddr;
    } else {
      // Load binary file
      const program = new Uint8Array(fs.readFileSync(filename));
      cpu.loadProgram(program);
      console.log(`Loaded ${program.length} bytes from ${filename}`);
    }

    console.log('');
    interactive(cpu);

  } catch (err) {
    if (err instanceof AssemblerError) {
      console.error(`Assembly Error: ${err.message}`);
      process.exit(1);
    } else if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

/**
 * Interactive mode (REPL)
 */
function interactive(cpu?: CPU): void {
  if (!cpu) {
    cpu = createCPU();
  }
  console.log('OPER-8 Interactive Mode');
  console.log('Type "help" for commands\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'oper8> ',
  });

  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();

    // Handle immediate assembly execution (starts with !)
    if (trimmed.startsWith('!')) {
      try {
        const asmCode = trimmed.substring(1).trim();
        const assembled = assemble(asmCode);

        // Save PC
        const savedPC = cpu.pc;

        // Write instruction to a temporary location ($0100)
        const tempAddr = 0x0100;
        cpu.memory[tempAddr] = assembled.opcode;
        cpu.memory[tempAddr + 1] = assembled.operand;
        if (assembled.immediate) {
          cpu.memory[tempAddr + 2] = assembled.immediate[0];
          cpu.memory[tempAddr + 3] = assembled.immediate[1];
        }

        // Execute from temp location
        cpu.pc = tempAddr;
        cpu.step();

        // Check if this was a jump instruction (opcodes $50-$58)
        // If so, keep the new PC; otherwise restore it
        const isJumpInstruction = assembled.opcode >= 0x50 && assembled.opcode <= 0x58;
        if (!isJumpInstruction) {
          cpu.pc = savedPC;
        }

        console.log(`Executed: ${asmCode}`);
        showCPUState(cpu);
      } catch (err) {
        if (err instanceof AssemblerError) {
          console.error(`Assembly error: ${err.message}`);
        } else {
          console.error(`Error: ${err}`);
        }
      }
      rl.prompt();
      return;
    }

    // Handle assembly code entry or PC setting (starts with @)
    if (trimmed.startsWith('@')) {
      try {
        const rest = trimmed.substring(1).trim();
        const parts = rest.split(/\s+/);

        if (parts.length === 1) {
          // Just @<addr> - set PC
          const addr = parseInt(parts[0], 16);
          if (isNaN(addr)) {
            console.error(`Invalid address: ${parts[0]}`);
          } else {
            cpu.pc = addr & 0xFFFF;
            console.log(`PC set to ${toHex(cpu.pc, 4)}`);
          }
        } else {
          // @<addr> <instruction> - assemble at address
          const addr = parseInt(parts[0], 16);
          const asmCode = parts.slice(1).join(' ');
          const assembled = assemble(asmCode);

          // Write to memory
          cpu.memory[addr] = assembled.opcode;
          cpu.memory[addr + 1] = assembled.operand;
          if (assembled.immediate) {
            cpu.memory[addr + 2] = assembled.immediate[0];
            cpu.memory[addr + 3] = assembled.immediate[1];
          }

          console.log(`Assembled at ${toHex(addr, 4)}: ${toHex(assembled.opcode)} ${toHex(assembled.operand)}` +
            (assembled.immediate ? ` ${toHex(assembled.immediate[0])} ${toHex(assembled.immediate[1])}` : ''));
        }
      } catch (err) {
        if (err instanceof AssemblerError) {
          console.error(`Assembly error: ${err.message}`);
        } else {
          console.error(`Error: ${err}`);
        }
      }
      rl.prompt();
      return;
    }

    const args = trimmed.split(/\s+/);
    const cmd = args[0].toLowerCase();

    switch (cmd) {
      case 'help':
        console.log('Commands:');
        console.log('  !<instruction>  - Execute assembly instruction immediately (PC unchanged)');
        console.log('                    Example: !LDLO R5, $A');
        console.log('  @<addr>         - Set PC to address');
        console.log('                    Example: @0200');
        console.log('  @<addr> <inst>  - Assemble instruction into memory at address');
        console.log('                    Example: @0200 ADD R1, R2');
        console.log('  asm             - Enter multi-line assembly mode at PC (blank line to exit)');
        console.log('  load <file>     - Load binary file into memory at PC');
        console.log('  run [steps]     - Run CPU (max steps, default 100000)');
        console.log('  step            - Execute one instruction');
        console.log('  reset           - Reset CPU');
        console.log('  regs            - Show registers');
        console.log('  mem <addr>      - Show memory at address (hex)');
        console.log('  dis [addr] [n]  - Disassemble n instructions at address (default: PC)');
        console.log('  poke <addr> <val> - Write byte to memory (hex)');
        console.log('  quit            - Exit');
        break;

      case 'asm': {
        console.log(`Assembling at PC=${toHex(cpu.pc, 4)} (enter blank line to exit):`);
        const startAddr = cpu.pc;
        const lines: string[] = [];

        const asmLoop = () => {
          rl.question('  ', (line) => {
            const trimmedLine = line.trim();

            if (trimmedLine === '') {
              // Blank line - assemble all collected lines
              try {
                const bytes = assembleProgram(lines, startAddr);
                // Write to memory
                cpu.memory.set(bytes, startAddr);
                console.log(`Assembly complete. ${bytes.length} bytes written.`);
              } catch (err) {
                if (err instanceof AssemblerError) {
                  console.error(`Assembly error: ${err.message}`);
                } else {
                  console.error(`Error: ${err}`);
                }
              }
              rl.prompt();
              return;
            }

            // Collect line (including labels)
            lines.push(trimmedLine);

            // Continue asm loop
            asmLoop();
          });
        };

        asmLoop();
        return; // Don't call rl.prompt() - handled by asmLoop
      }

      case 'load':
        if (args[1]) {
          try {
            const program = fs.readFileSync(args[1]);
            cpu.loadProgram(new Uint8Array(program));
            console.log(`Loaded ${program.length} bytes`);
          } catch (err) {
            console.error(`Error loading file: ${err}`);
          }
        } else {
          console.log('Usage: load <filename>');
        }
        break;

      case 'run': {
        cpu.halted = false;
        const maxSteps = args[1] ? parseInt(args[1]) : 100000;
        const steps = cpu.run(maxSteps);
        console.log(`Executed ${steps} steps`);
        showCPUState(cpu);
        break;
      }

      case 'step':
        cpu.step();
        showCPUState(cpu);
        break;

      case 'reset':
        cpu.reset();
        console.log('CPU reset');
        break;

      case 'regs':
        showCPUState(cpu);
        break;

      case 'mem':
        if (args[1]) {
          const addr = parseInt(args[1], 16);
          const count = args[2] ? parseInt(args[2]) : 16;
          for (let i = 0; i < count; i += 16) {
            const bytes = Array.from(cpu.memory.slice(addr + i, addr + i + 16))
              .map(b => toHex(b))
              .join(' ');
            console.log(`${toHex(addr + i, 4)}: ${bytes}`);
          }
        } else {
          console.log('Usage: mem <addr> [count]');
        }
        break;

      case 'dis': {
        const addr = args[1] ? parseInt(args[1], 16) : cpu.pc;
        const count = args[2] ? parseInt(args[2]) : 8;
        let currentAddr = addr;
        for (let i = 0; i < count; i++) {
          const opcode = cpu.memory[currentAddr];
          const operand = cpu.memory[currentAddr + 1];
          const nextBytes = [cpu.memory[currentAddr + 2], cpu.memory[currentAddr + 3]];
          const instruction = disassemble(opcode, operand, nextBytes);
          const bytes = `${toHex(opcode)} ${toHex(operand)}`;
          const marker = currentAddr === cpu.pc ? '>' : ' ';
          console.log(`${marker}${toHex(currentAddr, 4)}: ${bytes.padEnd(6)} ${instruction}`);

          // Check if this is LDI16 (4 bytes instead of 2)
          if (opcode === 0x13) {
            currentAddr += 4;
          } else {
            currentAddr += 2;
          }
        }
        break;
      }

      case 'poke':
        if (args[1] && args[2]) {
          const addr = parseInt(args[1], 16);
          const val = parseInt(args[2], 16);
          cpu.memory[addr] = val & 0xFF;
          console.log(`Wrote ${toHex(val)} to ${toHex(addr, 4)}`);
        } else {
          console.log('Usage: poke <addr> <value>');
        }
        break;

      case 'quit':
      case 'exit':
        rl.close();
        process.exit(0);
        break;

      case '':
        break;

      default:
        console.log(`Unknown command: ${cmd}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

/**
 * Utility: Convert number to hex string
 */
function toHex(n: number, width: number = 2): string {
  return n.toString(16).toUpperCase().padStart(width, '0');
}

/**
 * Utility: Boolean to 0/1
 */
function b(flag: boolean): number {
  return flag ? 1 : 0;
}

/**
 * Parse a condition string like "R0:40 R1:42 Z:1 M[50]:42" into register/flag/memory states
 */
function parseConditions(condStr: string): { registers: Map<number, number>, flags: Map<string, boolean>, memory: Map<number, number> } {
  const registers = new Map<number, number>();
  const flags = new Map<string, boolean>();
  const memory = new Map<number, number>();

  const parts = condStr.trim().split(/\s+/);
  for (const part of parts) {
    if (!part) continue;

    const [name, value] = part.split(':');
    if (!value) {
      throw new Error(`Invalid condition format: ${part}`);
    }

    if (name.toUpperCase().startsWith('M[')) {
      // Memory: M[addr]:value
      const match = name.match(/^M\[([0-9A-Fa-f]+)\]$/i);
      if (!match) {
        throw new Error(`Invalid memory syntax: ${name} (use M[addr]:value)`);
      }
      const addr = parseInt(match[1], 16);
      if (isNaN(addr) || addr < 0 || addr > 0xFFFF) {
        throw new Error(`Invalid memory address: ${match[1]}`);
      }
      const memValue = parseInt(value, 16);
      if (isNaN(memValue)) {
        throw new Error(`Invalid memory value: ${value}`);
      }
      memory.set(addr, memValue & 0xFF);
    } else if (name.toUpperCase().startsWith('R')) {
      // Register
      const regNum = parseInt(name.substring(1));
      if (isNaN(regNum) || regNum < 0 || regNum > 15) {
        throw new Error(`Invalid register: ${name}`);
      }
      const regValue = parseInt(value, 16);
      if (isNaN(regValue)) {
        throw new Error(`Invalid register value: ${value}`);
      }
      registers.set(regNum, regValue & 0xFF);
    } else if (['Z', 'C', 'N'].includes(name.toUpperCase())) {
      // Flag
      const flagValue = parseInt(value);
      if (flagValue !== 0 && flagValue !== 1) {
        throw new Error(`Invalid flag value (must be 0 or 1): ${value}`);
      }
      flags.set(name.toUpperCase(), flagValue === 1);
    } else if (name.toUpperCase() === 'PC') {
      // PC (handled separately, but parse it)
      const pcValue = parseInt(value, 16);
      if (isNaN(pcValue)) {
        throw new Error(`Invalid PC value: ${value}`);
      }
      registers.set(-1, pcValue); // Use -1 as special marker for PC
    } else {
      throw new Error(`Unknown register or flag: ${name}`);
    }
  }

  return { registers, flags, memory };
}

/**
 * Apply conditions to CPU
 */
function applyConditions(cpu: CPU, registers: Map<number, number>, flags: Map<string, boolean>, memory: Map<number, number>): void {
  for (const [reg, value] of registers) {
    if (reg === -1) {
      cpu.pc = value;
    } else {
      cpu.registers[reg] = value;
    }
  }
  for (const [flag, value] of flags) {
    if (flag === 'Z') cpu.flagZ = value;
    if (flag === 'C') cpu.flagC = value;
    if (flag === 'N') cpu.flagN = value;
  }
  for (const [addr, value] of memory) {
    cpu.memory[addr] = value;
  }
}

/**
 * Verify conditions match CPU state
 */
function verifyConditions(cpu: CPU, registers: Map<number, number>, flags: Map<string, boolean>, memory: Map<number, number>): { passed: boolean, errors: string[] } {
  const errors: string[] = [];

  for (const [reg, expected] of registers) {
    if (reg === -1) {
      // PC
      if (cpu.pc !== expected) {
        errors.push(`PC: expected ${toHex(expected, 4)}, got ${toHex(cpu.pc, 4)}`);
      }
    } else {
      const actual = cpu.registers[reg];
      if (actual !== expected) {
        errors.push(`R${reg}: expected ${toHex(expected)}, got ${toHex(actual)}`);
      }
    }
  }

  for (const [flag, expected] of flags) {
    let actual: boolean;
    if (flag === 'Z') actual = cpu.flagZ;
    else if (flag === 'C') actual = cpu.flagC;
    else if (flag === 'N') actual = cpu.flagN;
    else continue;

    if (actual !== expected) {
      errors.push(`${flag}: expected ${expected ? 1 : 0}, got ${actual ? 1 : 0}`);
    }
  }

  for (const [addr, expected] of memory) {
    const actual = cpu.memory[addr];
    if (actual !== expected) {
      errors.push(`M[${toHex(addr, 4)}]: expected ${toHex(expected)}, got ${toHex(actual)}`);
    }
  }

  return { passed: errors.length === 0, errors };
}

/**
 * Run a single-step test
 * @param testString The test string to run
 * @param verbose If true, show detailed output; if false, only show failures
 */
function runSingleStepTest(testString: string, verbose: boolean = true): boolean {
  try {
    // Split test string by semicolons
    const parts = testString.split(';').map(s => s.trim());

    if (parts.length < 3) {
      console.error('Error: Single-step test requires at least 3 parts: preconditions; instruction; postconditions');
      console.error('Example: "R0:40 R1:42; CMP R1, R0; Z:0 C:1"');
      process.exit(1);
    }

    const precondStr = parts[0];
    const instructions = parts.slice(1, -1);
    const postcondStr = parts[parts.length - 1];

    // Parse conditions
    const preconditions = parseConditions(precondStr);
    const postconditions = parseConditions(postcondStr);

    // Create CPU and apply preconditions
    const cpu = createCPU();
    applyConditions(cpu, preconditions.registers, preconditions.flags, preconditions.memory);

    if (verbose) {
      console.log('=== Single-Step Test ===');
      console.log(`Preconditions: ${precondStr}`);
      console.log(`Instructions:  ${instructions.join('; ')}`);
      console.log(`Postconditions: ${postcondStr}`);
      console.log();

      // Show initial state
      console.log('Initial state:');
      showCPUState(cpu);
    }

    // Assemble and execute each instruction
    const tempAddr = 0x0100;
    let currentAddr = tempAddr;

    for (const instruction of instructions) {
      const assembled = assemble(instruction);
      cpu.memory[currentAddr] = assembled.opcode;
      cpu.memory[currentAddr + 1] = assembled.operand;
      if (assembled.immediate) {
        cpu.memory[currentAddr + 2] = assembled.immediate[0];
        cpu.memory[currentAddr + 3] = assembled.immediate[1];
      }
      currentAddr += assembled.length;
    }

    // Execute instructions
    cpu.pc = tempAddr;
    for (let i = 0; i < instructions.length; i++) {
      cpu.step();
    }

    if (verbose) {
      // Show final state
      console.log('Final state:');
      showCPUState(cpu);
    }

    // Verify postconditions
    const result = verifyConditions(cpu, postconditions.registers, postconditions.flags, postconditions.memory);

    if (result.passed) {
      if (verbose) {
        console.log('✓ TEST PASSED');
      }
      return true;
    } else {
      console.log('✗ TEST FAILED');
      console.log(`  Test: ${precondStr} ; ${instructions.join('; ')} ; ${postcondStr}`);
      console.log('  Errors:');
      for (const error of result.errors) {
        console.log(`    - ${error}`);
      }
      return false;
    }

  } catch (err) {
    console.log('✗ TEST ERROR');
    console.log(`  Test: ${testString}`);
    if (err instanceof AssemblerError) {
      console.log(`  Assembly error: ${err.message}`);
    } else if (err instanceof Error) {
      console.log(`  Error: ${err.message}`);
    } else {
      console.log(`  Error: ${err}`);
    }
    return false;
  }
}

/**
 * Run tests from a file
 */
function runTestFile(filename: string): void {
  try {
    const content = fs.readFileSync(filename, 'utf-8');
    const lines = content.split('\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    console.log(`Running tests from ${filename}...\n`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Remove comments
      const commentIndex = line.indexOf('//');
      const testLine = commentIndex >= 0 ? line.substring(0, commentIndex) : line;
      const trimmed = testLine.trim();

      // Skip blank lines
      if (trimmed === '') continue;

      totalTests++;
      const passed = runSingleStepTest(trimmed, false);

      if (passed) {
        passedTests++;
        process.stdout.write('.');
      } else {
        failedTests++;
        console.log(`\n  (line ${lineNum})`);
      }
    }

    console.log('\n');
    console.log('=== Test Results ===');
    console.log(`Total:  ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);

    if (failedTests === 0) {
      console.log('\n✓ All tests passed!');
      process.exit(0);
    } else {
      console.log(`\n✗ ${failedTests} test(s) failed`);
      process.exit(1);
    }

  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error reading test file: ${err.message}`);
    }
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    console.log('OPER-8 CPU Emulator');
    console.log('\nUsage:');
    console.log('  oper8 <program.bin|.asm>     Run a binary or assembly program');
    console.log('  oper8 -i [program.bin|.asm]  Interactive mode (optionally load program)');
    console.log('  oper8 -d <program.bin|.asm>  Debug mode (step through)');
    console.log('  oper8 -ss <test>             Run single-step test');
    console.log('  oper8 -t <file>              Run tests from file');
    console.log('  oper8 -h                     Show this help');
    console.log('\nSingle-step test format:');
    console.log('  "preconditions; instruction(s); postconditions"');
    console.log('  Example: "R0:40 R1:42; CMP R1, R0; Z:0 C:0"');
    process.exit(0);
  }

  if (args[0] === '-i') {
    if (args[1]) {
      // Load program and drop into interactive mode
      loadProgramAndInteractive(args[1]);
    } else {
      interactive();
    }
  } else if (args[0] === '-d') {
    if (args[1]) {
      await runProgramOrAssembly(args[1], true);
    } else {
      console.error('Error: -d requires a program file');
      process.exit(1);
    }
  } else if (args[0] === '-ss') {
    if (args[1]) {
      const passed = runSingleStepTest(args[1]);
      process.exit(passed ? 0 : 1);
    } else {
      console.error('Error: -ss requires a test string');
      console.error('Example: node dist/cli.js -ss "R0:40 R1:42; CMP R1, R0; Z:0 C:0"');
      process.exit(1);
    }
  } else if (args[0] === '-t') {
    if (args[1]) {
      runTestFile(args[1]);
    } else {
      console.error('Error: -t requires a test file');
      process.exit(1);
    }
  } else {
    await runProgramOrAssembly(args[0], false);
  }
}

main();

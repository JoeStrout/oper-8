/**
 * OPER-8 CPU Emulator Core
 *
 * This module implements the OPER-8 8-bit fantasy CPU.
 * It has no I/O dependencies and can run in both Node.js and browser environments.
 */

export class CPU {
  // 16 general-purpose 8-bit registers
  registers: Uint8Array = new Uint8Array(16);

  // 64K address space
  memory: Uint8Array = new Uint8Array(65536);

  // Program counter (16-bit)
  pc: number = 0;

  // Status flags
  flagZ: boolean = false; // Zero
  flagC: boolean = false; // Carry
  flagN: boolean = false; // Negative

  // Halted state
  halted: boolean = false;

  // I/O callbacks (set by environment)
  onCharOutput?: (char: number) => void;
  onCharInput?: () => number; // Returns character or 0 if none available

  constructor() {
    this.reset();
  }

  /**
   * Reset CPU to initial state
   */
  reset(): void {
    this.registers.fill(0);
    this.memory.fill(0);
    this.pc = 0x200;    // program starts by default at $200
    this.flagZ = false;
    this.flagC = false;
    this.flagN = false;
    this.halted = false;

    // Initialize default fault handling
    // HALT at $FFFE
    this.memory[0xFFFE] = 0xFF; // HLT opcode
    this.memory[0xFFFF] = 0xFF; // operand

    // Fault vector points to $FFFE
    this.memory[0x00FE] = 0xFF;
    this.memory[0x00FF] = 0xFE;
  }

  /**
   * Load program into memory at specified address
   */
  loadProgram(data: Uint8Array, address: number = 0): void {
    this.memory.set(data, address);
  }

  /**
   * Execute one instruction
   * Returns false if halted, true otherwise
   */
  step(): boolean {
    if (this.halted) return false;

    // Check for misaligned PC
    if (this.pc % 2 !== 0) {
      this.fault(0x03); // FAULT_MISALIGNED_PC
      return !this.halted;
    }

    // Fetch instruction
    const opcode = this.memory[this.pc];
    const operand = this.memory[this.pc + 1];

    // Decode and execute
    this.execute(opcode, operand);

    return !this.halted;
  }

  /**
   * Run CPU until halted or max steps reached
   */
  run(maxSteps: number = 100000): number {
    let steps = 0;
    while (steps < maxSteps && this.step()) {
      steps++;
    }
    return steps;
  }

  /**
   * Trigger a fault
   */
  private fault(code: number): void {
    // Store fault code in R0
    this.registers[0] = code;

    // Store PC in $00FC-$00FD
    this.memory[0x00FC] = (this.pc >> 8) & 0xFF;
    this.memory[0x00FD] = this.pc & 0xFF;

    // Jump to fault handler
    const handlerAddr = (this.memory[0x00FE] << 8) | this.memory[0x00FF];
    this.pc = handlerAddr;
  }

  /**
   * Execute a single instruction
   */
  private execute(opcode: number, operand: number): void {
    // Extract register fields from operand byte
    const rx = (operand >> 4) & 0x0F;
    const ry = operand & 0x0F;
    const imm = operand;

    switch (opcode) {
      // NOP
      case 0x00:
        this.pc += 2;
        break;

      // LDI0-LDI15
      case 0x10: this.registers[0] = imm; this.pc += 2; break;
      case 0x11: this.registers[1] = imm; this.pc += 2; break;
      case 0x12: this.registers[2] = imm; this.pc += 2; break;
      case 0x13: this.registers[3] = imm; this.pc += 2; break;
      case 0x14: this.registers[4] = imm; this.pc += 2; break;
      case 0x15: this.registers[5] = imm; this.pc += 2; break;
      case 0x16: this.registers[6] = imm; this.pc += 2; break;
      case 0x17: this.registers[7] = imm; this.pc += 2; break;
      case 0x18: this.registers[8] = imm; this.pc += 2; break;
      case 0x19: this.registers[9] = imm; this.pc += 2; break;
      case 0x1A: this.registers[10] = imm; this.pc += 2; break;
      case 0x1B: this.registers[11] = imm; this.pc += 2; break;
      case 0x1C: this.registers[12] = imm; this.pc += 2; break;
      case 0x1D: this.registers[13] = imm; this.pc += 2; break;
      case 0x1E: this.registers[14] = imm; this.pc += 2; break;
      case 0x1F: this.registers[15] = imm; this.pc += 2; break;

      // MOV
      case 0x20:
        this.registers[rx] = this.registers[ry];
        this.pc += 2;
        break;

      // SWAP
      case 0x21: {
        const temp = this.registers[rx];
        this.registers[rx] = this.registers[ry];
        this.registers[ry] = temp;
        this.pc += 2;
        break;
      }

      // LOAD
      case 0x22: {
        const addr = (this.registers[ry] << 8) | this.registers[(ry + 1) & 0x0F];
        this.registers[rx] = this.memory[addr];
        this.pc += 2;
        break;
      }

      // STOR
      case 0x23: {
        const addr = (this.registers[ry] << 8) | this.registers[(ry + 1) & 0x0F];
        this.memory[addr] = this.registers[rx];
        this.pc += 2;
        break;
      }

      // LOADZ
      case 0x24:
        this.registers[0] = this.memory[imm];
        this.pc += 2;
        break;

      // STORZ
      case 0x25:
        this.memory[imm] = this.registers[0];
        this.pc += 2;
        break;

      // ADD
      case 0x30: {
        const result = this.registers[rx] + this.registers[ry];
        this.registers[rx] = result & 0xFF;
        this.setFlags(this.registers[rx], result > 0xFF);
        this.pc += 2;
        break;
      }

      // ADC
      case 0x31: {
        const result = this.registers[rx] + this.registers[ry] + (this.flagC ? 1 : 0);
        this.registers[rx] = result & 0xFF;
        this.setFlags(this.registers[rx], result > 0xFF);
        this.pc += 2;
        break;
      }

      // SUB
      case 0x32: {
        const result = this.registers[rx] - this.registers[ry];
        this.flagC = this.registers[ry] > this.registers[rx];
        this.registers[rx] = result & 0xFF;
        this.flagZ = this.registers[rx] === 0;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // SBC
      case 0x33: {
        const result = this.registers[rx] - this.registers[ry] - (this.flagC ? 1 : 0);
        this.flagC = (this.registers[ry] + (this.flagC ? 1 : 0)) > this.registers[rx];
        this.registers[rx] = result & 0xFF;
        this.flagZ = this.registers[rx] === 0;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // INC
      case 0x34: {
        const result = this.registers[rx] + 1;
        this.registers[rx] = result & 0xFF;
        this.setFlags(this.registers[rx], result > 0xFF);
        this.pc += 2;
        break;
      }

      // DEC
      case 0x35: {
        const result = this.registers[rx] - 1;
        this.flagC = result < 0;
        this.registers[rx] = result & 0xFF;
        this.flagZ = this.registers[rx] === 0;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // CMP
      case 0x36: {
        const result = this.registers[rx] - this.registers[ry];
        this.flagC = this.registers[ry] > this.registers[rx];
        this.flagZ = (result & 0xFF) === 0;
        this.flagN = ((result & 0xFF) & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // MUL
      case 0x37: {
        const result = this.registers[rx] * this.registers[ry];
        this.registers[rx] = (result >> 8) & 0xFF;
        this.registers[(rx + 1) & 0x0F] = result & 0xFF;
        this.flagZ = result === 0;
        this.flagC = result > 0xFF;
        this.flagN = (this.registers[(rx + 1) & 0x0F] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // DIV
      case 0x38: {
        if (this.registers[ry] === 0) {
          this.fault(0x02); // FAULT_DIV_ZERO
        } else {
          const quotient = Math.floor(this.registers[rx] / this.registers[ry]);
          const remainder = this.registers[rx] % this.registers[ry];
          this.registers[rx] = quotient;
          this.registers[(rx + 1) & 0x0F] = remainder;
          this.flagZ = quotient === 0;
          this.flagC = false;
          this.flagN = (quotient & 0x80) !== 0;
          this.pc += 2;
        }
        break;
      }

      // AND
      case 0x40: {
        this.registers[rx] &= this.registers[ry];
        this.flagZ = this.registers[rx] === 0;
        this.flagC = false;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // OR
      case 0x41: {
        this.registers[rx] |= this.registers[ry];
        this.flagZ = this.registers[rx] === 0;
        this.flagC = false;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // XOR
      case 0x42: {
        this.registers[rx] ^= this.registers[ry];
        this.flagZ = this.registers[rx] === 0;
        this.flagC = false;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // NOT
      case 0x43: {
        this.registers[rx] = (~this.registers[rx]) & 0xFF;
        this.flagZ = this.registers[rx] === 0;
        this.flagC = false;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // SHL
      case 0x44: {
        const bit7 = (this.registers[rx] & 0x80) !== 0;
        this.registers[rx] = ((this.registers[rx] << 1) | (this.flagC ? 1 : 0)) & 0xFF;
        this.flagC = bit7;
        this.flagZ = this.registers[rx] === 0;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // SHR
      case 0x45: {
        const bit0 = (this.registers[rx] & 0x01) !== 0;
        this.registers[rx] = (this.registers[rx] >> 1) | (this.flagC ? 0x80 : 0);
        this.flagC = bit0;
        this.flagZ = this.registers[rx] === 0;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;
      }

      // TEST
      case 0x46: {
        const result = this.registers[rx] & this.registers[ry];
        this.flagZ = result === 0;
        this.flagN = (result & 0x80) !== 0;
        // C flag unchanged
        this.pc += 2;
        break;
      }

      // JMP
      case 0x50: {
        const offset = this.signExtend(imm);
        this.pc = (this.pc + 2 + offset) & 0xFFFF;
        break;
      }

      // JMPL
      case 0x51:
        this.pc = (this.registers[rx] << 8) | this.registers[ry];
        break;

      // JZ
      case 0x52: {
        if (this.flagZ) {
          const offset = this.signExtend(imm);
          this.pc = (this.pc + 2 + offset) & 0xFFFF;
        } else {
          this.pc += 2;
        }
        break;
      }

      // JNZ
      case 0x53: {
        if (!this.flagZ) {
          const offset = this.signExtend(imm);
          this.pc = (this.pc + 2 + offset) & 0xFFFF;
        } else {
          this.pc += 2;
        }
        break;
      }

      // JC
      case 0x54: {
        if (this.flagC) {
          const offset = this.signExtend(imm);
          this.pc = (this.pc + 2 + offset) & 0xFFFF;
        } else {
          this.pc += 2;
        }
        break;
      }

      // JNC
      case 0x55: {
        if (!this.flagC) {
          const offset = this.signExtend(imm);
          this.pc = (this.pc + 2 + offset) & 0xFFFF;
        } else {
          this.pc += 2;
        }
        break;
      }

      // JN
      case 0x56: {
        if (this.flagN) {
          const offset = this.signExtend(imm);
          this.pc = (this.pc + 2 + offset) & 0xFFFF;
        } else {
          this.pc += 2;
        }
        break;
      }

      // CALL
      case 0x57: {
        const returnAddr = (this.pc + 2) & 0xFFFF;
        const sp = (this.registers[14] << 8) | this.registers[15];
        const newSp = (sp - 2) & 0xFFFF;
        this.memory[newSp] = (returnAddr >> 8) & 0xFF;
        this.memory[newSp + 1] = returnAddr & 0xFF;
        this.registers[14] = (newSp >> 8) & 0xFF;
        this.registers[15] = newSp & 0xFF;
        const offset = this.signExtend(imm);
        this.pc = (this.pc + 2 + offset) & 0xFFFF;
        break;
      }

      // CALLL
      case 0x58: {
        const returnAddr = (this.pc + 2) & 0xFFFF;
        const sp = (this.registers[14] << 8) | this.registers[15];
        const newSp = (sp - 2) & 0xFFFF;
        this.memory[newSp] = (returnAddr >> 8) & 0xFF;
        this.memory[newSp + 1] = returnAddr & 0xFF;
        this.registers[14] = (newSp >> 8) & 0xFF;
        this.registers[15] = newSp & 0xFF;
        this.pc = (this.registers[rx] << 8) | this.registers[ry];
        break;
      }

      // RET
      case 0x59: {
        const sp = (this.registers[14] << 8) | this.registers[15];
        const returnAddr = (this.memory[sp] << 8) | this.memory[sp + 1];
        const newSp = (sp + 2) & 0xFFFF;
        this.registers[14] = (newSp >> 8) & 0xFF;
        this.registers[15] = newSp & 0xFF;
        this.pc = returnAddr;
        break;
      }

      // PUSH
      case 0x60: {
        let sp = (this.registers[14] << 8) | this.registers[15];
        let r = rx;
        do {
          sp = (sp - 1) & 0xFFFF;
          this.memory[sp] = this.registers[r];
          if (r === ry) break;
          r = (r + 1) & 0x0F;
        } while (true);
        this.registers[14] = (sp >> 8) & 0xFF;
        this.registers[15] = sp & 0xFF;
        this.pc += 2;
        break;
      }

      // POP
      case 0x61: {
        let sp = (this.registers[14] << 8) | this.registers[15];
        let r = rx;
        do {
          this.registers[r] = this.memory[sp];
          sp = (sp + 1) & 0xFFFF;
          if (r === ry) break;
          r = (r + 1) & 0x0F;
        } while (true);
        this.registers[14] = (sp >> 8) & 0xFF;
        this.registers[15] = sp & 0xFF;
        this.pc += 2;
        break;
      }

      // PRINT
      case 0x70:
        if (this.onCharOutput) {
          this.onCharOutput(this.registers[rx]);
        }
        this.pc += 2;
        break;

      // INPUT
      case 0x71:
        if (this.onCharInput) {
          this.registers[rx] = this.onCharInput();
        } else {
          this.registers[rx] = 0;
        }
        this.flagZ = this.registers[rx] === 0;
        this.flagN = (this.registers[rx] & 0x80) !== 0;
        this.pc += 2;
        break;

      // HLT
      case 0xFF:
        this.halted = true;
        break;

      // Invalid opcode
      default:
        this.fault(0x01); // FAULT_INVALID_OPCODE
        break;
    }
  }

  /**
   * Set flags based on result
   */
  private setFlags(value: number, carry: boolean): void {
    this.flagZ = value === 0;
    this.flagC = carry;
    this.flagN = (value & 0x80) !== 0;
  }

  /**
   * Sign-extend 8-bit value to signed integer
   */
  private signExtend(value: number): number {
    return value & 0x80 ? value - 256 : value;
  }
}

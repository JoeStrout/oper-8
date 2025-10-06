/**
 * OPER-8 Assembler
 *
 * Converts assembly mnemonics to bytecode
 */

export interface AssembledInstruction {
  opcode: number;
  operand: number;
  length: number; // 2 or 4 (for LDI16)
  immediate?: number[]; // For LDI16, the 2 immediate bytes
}

export class AssemblerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssemblerError';
  }
}

/**
 * Parse a register name like "R5" or "R15" and return register number
 */
function parseRegister(s: string): number {
  s = s.trim().toUpperCase();
  if (!s.startsWith('R')) {
    throw new AssemblerError(`Invalid register: ${s}`);
  }
  const num = parseInt(s.substring(1));
  if (isNaN(num) || num < 0 || num > 15) {
    throw new AssemblerError(`Invalid register number: ${s}`);
  }
  return num;
}

/**
 * Parse an immediate value (hex with $ prefix, or decimal)
 */
function parseImmediate(s: string): number {
  s = s.trim().toUpperCase();
  let value: number;

  if (s.startsWith('$')) {
    value = parseInt(s.substring(1), 16);
  } else if (s.startsWith('0X')) {
    value = parseInt(s.substring(2), 16);
  } else {
    value = parseInt(s, 10);
  }

  if (isNaN(value)) {
    throw new AssemblerError(`Invalid immediate value: ${s}`);
  }

  return value;
}

/**
 * Assemble a single instruction from assembly text
 * Returns the opcode and operand bytes
 */
export function assemble(instruction: string): AssembledInstruction {
  // Clean up the instruction
  instruction = instruction.trim().toUpperCase();

  // Split into mnemonic and operands
  const parts = instruction.split(/[\s,]+/).filter(s => s.length > 0);
  if (parts.length === 0) {
    throw new AssemblerError('Empty instruction');
  }

  const mnemonic = parts[0];
  const operands = parts.slice(1);

  // Assemble based on mnemonic
  switch (mnemonic) {
    // NOP
    case 'NOP':
      return { opcode: 0x00, operand: 0x00, length: 2 };

    // Data Movement
    case 'LDLO': {
      if (operands.length !== 2) {
        throw new AssemblerError('LDLO requires 2 operands: Rx, #imm');
      }
      const rx = parseRegister(operands[0]);
      const imm = parseImmediate(operands[1]);
      return { opcode: 0x10, operand: (rx << 4) | (imm & 0x0F), length: 2 };
    }

    case 'LDHI': {
      if (operands.length !== 2) {
        throw new AssemblerError('LDHI requires 2 operands: Rx, #imm');
      }
      const rx = parseRegister(operands[0]);
      const imm = parseImmediate(operands[1]);
      return { opcode: 0x11, operand: (rx << 4) | (imm & 0x0F), length: 2 };
    }

    case 'LDI0': {
      if (operands.length !== 1) {
        throw new AssemblerError('LDI0 requires 1 operand: #imm');
      }
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x12, operand: imm & 0xFF, length: 2 };
    }

    case 'LDI16': {
      if (operands.length !== 3) {
        throw new AssemblerError('LDI16 requires 3 operands: Rx, Ry, #imm16');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      const imm16 = parseImmediate(operands[2]);
      const high = (imm16 >> 8) & 0xFF;
      const low = imm16 & 0xFF;
      return {
        opcode: 0x13,
        operand: (rx << 4) | ry,
        length: 4,
        immediate: [high, low]
      };
    }

    case 'MOV': {
      if (operands.length !== 2) {
        throw new AssemblerError('MOV requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x14, operand: (rx << 4) | ry, length: 2 };
    }

    case 'SWAP': {
      if (operands.length !== 2) {
        throw new AssemblerError('SWAP requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x15, operand: (rx << 4) | ry, length: 2 };
    }

    // Memory Access
    case 'LOAD': {
      if (operands.length !== 2) {
        throw new AssemblerError('LOAD requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x20, operand: (rx << 4) | ry, length: 2 };
    }

    case 'STOR': {
      if (operands.length !== 2) {
        throw new AssemblerError('STOR requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x21, operand: (rx << 4) | ry, length: 2 };
    }

    case 'LOADZ': {
      if (operands.length !== 1) {
        throw new AssemblerError('LOADZ requires 1 operand: #addr');
      }
      const addr = parseImmediate(operands[0]);
      return { opcode: 0x22, operand: addr & 0xFF, length: 2 };
    }

    case 'STORZ': {
      if (operands.length !== 1) {
        throw new AssemblerError('STORZ requires 1 operand: #addr');
      }
      const addr = parseImmediate(operands[0]);
      return { opcode: 0x23, operand: addr & 0xFF, length: 2 };
    }

    // Arithmetic
    case 'ADD': {
      if (operands.length !== 2) {
        throw new AssemblerError('ADD requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x30, operand: (rx << 4) | ry, length: 2 };
    }

    case 'ADC': {
      if (operands.length !== 2) {
        throw new AssemblerError('ADC requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x31, operand: (rx << 4) | ry, length: 2 };
    }

    case 'SUB': {
      if (operands.length !== 2) {
        throw new AssemblerError('SUB requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x32, operand: (rx << 4) | ry, length: 2 };
    }

    case 'SBC': {
      if (operands.length !== 2) {
        throw new AssemblerError('SBC requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x33, operand: (rx << 4) | ry, length: 2 };
    }

    case 'INC': {
      if (operands.length !== 1) {
        throw new AssemblerError('INC requires 1 operand: Rx');
      }
      const rx = parseRegister(operands[0]);
      return { opcode: 0x34, operand: (rx << 4), length: 2 };
    }

    case 'DEC': {
      if (operands.length !== 1) {
        throw new AssemblerError('DEC requires 1 operand: Rx');
      }
      const rx = parseRegister(operands[0]);
      return { opcode: 0x35, operand: (rx << 4), length: 2 };
    }

    case 'CMP': {
      if (operands.length !== 2) {
        throw new AssemblerError('CMP requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x36, operand: (rx << 4) | ry, length: 2 };
    }

    case 'MUL': {
      if (operands.length !== 2) {
        throw new AssemblerError('MUL requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x37, operand: (rx << 4) | ry, length: 2 };
    }

    case 'DIV': {
      if (operands.length !== 2) {
        throw new AssemblerError('DIV requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x38, operand: (rx << 4) | ry, length: 2 };
    }

    // Logical
    case 'AND': {
      if (operands.length !== 2) {
        throw new AssemblerError('AND requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x40, operand: (rx << 4) | ry, length: 2 };
    }

    case 'OR': {
      if (operands.length !== 2) {
        throw new AssemblerError('OR requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x41, operand: (rx << 4) | ry, length: 2 };
    }

    case 'XOR': {
      if (operands.length !== 2) {
        throw new AssemblerError('XOR requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x42, operand: (rx << 4) | ry, length: 2 };
    }

    case 'NOT': {
      if (operands.length !== 1) {
        throw new AssemblerError('NOT requires 1 operand: Rx');
      }
      const rx = parseRegister(operands[0]);
      return { opcode: 0x43, operand: (rx << 4), length: 2 };
    }

    case 'SHL': {
      if (operands.length !== 1) {
        throw new AssemblerError('SHL requires 1 operand: Rx');
      }
      const rx = parseRegister(operands[0]);
      return { opcode: 0x44, operand: (rx << 4), length: 2 };
    }

    case 'SHR': {
      if (operands.length !== 1) {
        throw new AssemblerError('SHR requires 1 operand: Rx');
      }
      const rx = parseRegister(operands[0]);
      return { opcode: 0x45, operand: (rx << 4), length: 2 };
    }

    case 'TEST': {
      if (operands.length !== 2) {
        throw new AssemblerError('TEST requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x46, operand: (rx << 4) | ry, length: 2 };
    }

    // Control Flow
    case 'JMP': {
      if (operands.length !== 1) {
        throw new AssemblerError('JMP requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]);
      return { opcode: 0x50, operand: offset & 0xFF, length: 2 };
    }

    case 'JMPL': {
      if (operands.length !== 2) {
        throw new AssemblerError('JMPL requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x51, operand: (rx << 4) | ry, length: 2 };
    }

    case 'JZ': {
      if (operands.length !== 1) {
        throw new AssemblerError('JZ requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]);
      return { opcode: 0x52, operand: offset & 0xFF, length: 2 };
    }

    case 'JNZ': {
      if (operands.length !== 1) {
        throw new AssemblerError('JNZ requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]);
      return { opcode: 0x53, operand: offset & 0xFF, length: 2 };
    }

    case 'JC': {
      if (operands.length !== 1) {
        throw new AssemblerError('JC requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]);
      return { opcode: 0x54, operand: offset & 0xFF, length: 2 };
    }

    case 'JNC': {
      if (operands.length !== 1) {
        throw new AssemblerError('JNC requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]);
      return { opcode: 0x55, operand: offset & 0xFF, length: 2 };
    }

    case 'JN': {
      if (operands.length !== 1) {
        throw new AssemblerError('JN requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]);
      return { opcode: 0x56, operand: offset & 0xFF, length: 2 };
    }

    case 'CALL': {
      if (operands.length !== 1) {
        throw new AssemblerError('CALL requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]);
      return { opcode: 0x57, operand: offset & 0xFF, length: 2 };
    }

    case 'CALLL': {
      if (operands.length !== 2) {
        throw new AssemblerError('CALLL requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x58, operand: (rx << 4) | ry, length: 2 };
    }

    case 'RET': {
      return { opcode: 0x59, operand: 0x00, length: 2 };
    }

    // Stack
    case 'PUSH': {
      if (operands.length !== 2) {
        throw new AssemblerError('PUSH requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x60, operand: (rx << 4) | ry, length: 2 };
    }

    case 'POP': {
      if (operands.length !== 2) {
        throw new AssemblerError('POP requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x61, operand: (rx << 4) | ry, length: 2 };
    }

    // Misc
    case 'HLT': {
      return { opcode: 0xFF, operand: 0xFF, length: 2 };
    }

    default:
      throw new AssemblerError(`Unknown mnemonic: ${mnemonic}`);
  }
}

/**
 * Disassemble a single instruction
 */
export function disassemble(opcode: number, operand: number, nextBytes?: number[]): string {
  const rx = (operand >> 4) & 0x0F;
  const ry = operand & 0x0F;
  const imm = operand;
  const toHex = (n: number, w: number = 2) => n.toString(16).toUpperCase().padStart(w, '0');

  switch (opcode) {
    case 0x00: return 'NOP';
    case 0x10: return `LDLO R${rx}, $${toHex(imm & 0x0F, 1)}`;
    case 0x11: return `LDHI R${rx}, $${toHex(imm & 0x0F, 1)}`;
    case 0x12: return `LDI0 $${toHex(imm)}`;
    case 0x13: {
      if (nextBytes && nextBytes.length >= 2) {
        const imm16 = (nextBytes[0] << 8) | nextBytes[1];
        return `LDI16 R${rx}, R${ry}, $${toHex(imm16, 4)}`;
      }
      return `LDI16 R${rx}, R${ry}, ???`;
    }
    case 0x14: return `MOV R${rx}, R${ry}`;
    case 0x15: return `SWAP R${rx}, R${ry}`;
    case 0x20: return `LOAD R${rx}, R${ry}`;
    case 0x21: return `STOR R${rx}, R${ry}`;
    case 0x22: return `LOADZ $${toHex(imm)}`;
    case 0x23: return `STORZ $${toHex(imm)}`;
    case 0x30: return `ADD R${rx}, R${ry}`;
    case 0x31: return `ADC R${rx}, R${ry}`;
    case 0x32: return `SUB R${rx}, R${ry}`;
    case 0x33: return `SBC R${rx}, R${ry}`;
    case 0x34: return `INC R${rx}`;
    case 0x35: return `DEC R${rx}`;
    case 0x36: return `CMP R${rx}, R${ry}`;
    case 0x37: return `MUL R${rx}, R${ry}`;
    case 0x38: return `DIV R${rx}, R${ry}`;
    case 0x40: return `AND R${rx}, R${ry}`;
    case 0x41: return `OR R${rx}, R${ry}`;
    case 0x42: return `XOR R${rx}, R${ry}`;
    case 0x43: return `NOT R${rx}`;
    case 0x44: return `SHL R${rx}`;
    case 0x45: return `SHR R${rx}`;
    case 0x46: return `TEST R${rx}, R${ry}`;
    case 0x50: return `JMP ${imm > 127 ? imm - 256 : imm}`;
    case 0x51: return `JMPL R${rx}, R${ry}`;
    case 0x52: return `JZ ${imm > 127 ? imm - 256 : imm}`;
    case 0x53: return `JNZ ${imm > 127 ? imm - 256 : imm}`;
    case 0x54: return `JC ${imm > 127 ? imm - 256 : imm}`;
    case 0x55: return `JNC ${imm > 127 ? imm - 256 : imm}`;
    case 0x56: return `JN ${imm > 127 ? imm - 256 : imm}`;
    case 0x57: return `CALL ${imm > 127 ? imm - 256 : imm}`;
    case 0x58: return `CALLL R${rx}, R${ry}`;
    case 0x59: return `RET`;
    case 0x60: return `PUSH R${rx}, R${ry}`;
    case 0x61: return `POP R${rx}, R${ry}`;
    case 0xFF: return 'HLT';
    default: return `??? [$${toHex(opcode)} $${toHex(operand)}]`;
  }
}

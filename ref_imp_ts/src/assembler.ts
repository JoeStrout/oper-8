/**
 * OPER-8 Assembler
 *
 * Converts assembly mnemonics to bytecode
 */

export interface AssembledInstruction {
  opcode: number;
  operand: number;
  length: number; // Always 2
  immediate?: number[]; // Reserved for future multi-byte instructions
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
 * Can also be a label reference (resolved later)
 */
function parseImmediate(s: string, labels?: Map<string, number>, currentAddr?: number): number {
  s = s.trim().toUpperCase();
  let value: number;

  // Check if it's a label reference
  if (labels && /^[A-Z_][A-Z0-9_]*$/.test(s)) {
    const labelAddr = labels.get(s);
    if (labelAddr === undefined) {
      throw new AssemblerError(`Undefined label: ${s}`);
    }
    // Calculate relative offset from instruction after this one
    if (currentAddr !== undefined) {
      const offset = labelAddr - (currentAddr + 2);
      if (offset < -128 || offset > 127) {
        throw new AssemblerError(`Label ${s} out of range: ${offset}`);
      }
      return offset & 0xFF;
    }
    return labelAddr;
  }

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

    // Load Immediate
    case 'LDI0': {
      if (operands.length !== 1) throw new AssemblerError('LDI0 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x10, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI1': {
      if (operands.length !== 1) throw new AssemblerError('LDI1 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x11, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI2': {
      if (operands.length !== 1) throw new AssemblerError('LDI2 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x12, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI3': {
      if (operands.length !== 1) throw new AssemblerError('LDI3 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x13, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI4': {
      if (operands.length !== 1) throw new AssemblerError('LDI4 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x14, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI5': {
      if (operands.length !== 1) throw new AssemblerError('LDI5 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x15, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI6': {
      if (operands.length !== 1) throw new AssemblerError('LDI6 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x16, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI7': {
      if (operands.length !== 1) throw new AssemblerError('LDI7 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x17, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI8': {
      if (operands.length !== 1) throw new AssemblerError('LDI8 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x18, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI9': {
      if (operands.length !== 1) throw new AssemblerError('LDI9 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x19, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI10': {
      if (operands.length !== 1) throw new AssemblerError('LDI10 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x1A, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI11': {
      if (operands.length !== 1) throw new AssemblerError('LDI11 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x1B, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI12': {
      if (operands.length !== 1) throw new AssemblerError('LDI12 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x1C, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI13': {
      if (operands.length !== 1) throw new AssemblerError('LDI13 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x1D, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI14': {
      if (operands.length !== 1) throw new AssemblerError('LDI14 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x1E, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI15': {
      if (operands.length !== 1) throw new AssemblerError('LDI15 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]);
      return { opcode: 0x1F, operand: imm & 0xFF, length: 2 };
    }

    // Data Movement
    case 'MOV': {
      if (operands.length !== 2) {
        throw new AssemblerError('MOV requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x20, operand: (rx << 4) | ry, length: 2 };
    }

    case 'SWAP': {
      if (operands.length !== 2) {
        throw new AssemblerError('SWAP requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x21, operand: (rx << 4) | ry, length: 2 };
    }

    case 'LOAD': {
      if (operands.length !== 2) {
        throw new AssemblerError('LOAD requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x22, operand: (rx << 4) | ry, length: 2 };
    }

    case 'STOR': {
      if (operands.length !== 2) {
        throw new AssemblerError('STOR requires 2 operands: Rx, Ry');
      }
      const rx = parseRegister(operands[0]);
      const ry = parseRegister(operands[1]);
      return { opcode: 0x23, operand: (rx << 4) | ry, length: 2 };
    }

    case 'LOADZ': {
      if (operands.length !== 1) {
        throw new AssemblerError('LOADZ requires 1 operand: #addr');
      }
      const addr = parseImmediate(operands[0]);
      return { opcode: 0x24, operand: addr & 0xFF, length: 2 };
    }

    case 'STORZ': {
      if (operands.length !== 1) {
        throw new AssemblerError('STORZ requires 1 operand: #addr');
      }
      const addr = parseImmediate(operands[0]);
      return { opcode: 0x25, operand: addr & 0xFF, length: 2 };
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

    // I/O
    case 'PRINT': {
      if (operands.length !== 1) {
        throw new AssemblerError('PRINT requires 1 operand: Rx');
      }
      const rx = parseRegister(operands[0]);
      return { opcode: 0x70, operand: rx << 4, length: 2 };
    }

    case 'INPUT': {
      if (operands.length !== 1) {
        throw new AssemblerError('INPUT requires 1 operand: Rx');
      }
      const rx = parseRegister(operands[0]);
      return { opcode: 0x71, operand: rx << 4, length: 2 };
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
    case 0x10: return `LDI0 $${toHex(imm)}`;
    case 0x11: return `LDI1 $${toHex(imm)}`;
    case 0x12: return `LDI2 $${toHex(imm)}`;
    case 0x13: return `LDI3 $${toHex(imm)}`;
    case 0x14: return `LDI4 $${toHex(imm)}`;
    case 0x15: return `LDI5 $${toHex(imm)}`;
    case 0x16: return `LDI6 $${toHex(imm)}`;
    case 0x17: return `LDI7 $${toHex(imm)}`;
    case 0x18: return `LDI8 $${toHex(imm)}`;
    case 0x19: return `LDI9 $${toHex(imm)}`;
    case 0x1A: return `LDI10 $${toHex(imm)}`;
    case 0x1B: return `LDI11 $${toHex(imm)}`;
    case 0x1C: return `LDI12 $${toHex(imm)}`;
    case 0x1D: return `LDI13 $${toHex(imm)}`;
    case 0x1E: return `LDI14 $${toHex(imm)}`;
    case 0x1F: return `LDI15 $${toHex(imm)}`;
    case 0x20: return `MOV R${rx}, R${ry}`;
    case 0x21: return `SWAP R${rx}, R${ry}`;
    case 0x22: return `LOAD R${rx}, R${ry}`;
    case 0x23: return `STOR R${rx}, R${ry}`;
    case 0x24: return `LOADZ $${toHex(imm)}`;
    case 0x25: return `STORZ $${toHex(imm)}`;
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
    case 0x70: return `PRINT R${rx}`;
    case 0x71: return `INPUT R${rx}`;
    case 0xFF: return 'HLT';
    default: return `??? [$${toHex(opcode)} $${toHex(operand)}]`;
  }
}

/**
 * Assemble multiple lines with label support
 * Labels are defined with a colon suffix: "loop:"
 * Labels can be referenced in jump instructions: "JMP loop"
 */
export function assembleProgram(lines: string[], startAddr: number = 0): Uint8Array {
  const labels = new Map<string, number>();
  const instructions: { line: string; addr: number }[] = [];

  // First pass: find labels and calculate addresses
  let addr = startAddr;
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith(';') || trimmed.startsWith('//')) {
      continue;
    }

    // Check for label definition (ends with :)
    if (trimmed.endsWith(':')) {
      const label = trimmed.substring(0, trimmed.length - 1).trim().toUpperCase();
      if (labels.has(label)) {
        throw new AssemblerError(`Duplicate label: ${label}`);
      }
      labels.set(label, addr);
      continue;
    }

    // Regular instruction
    instructions.push({ line: trimmed, addr });
    addr += 2; // All instructions are 2 bytes
  }

  // Second pass: assemble instructions with label resolution
  const bytes: number[] = [];
  for (const { line, addr } of instructions) {
    const assembled = assembleLine(line, labels, addr);
    bytes.push(assembled.opcode, assembled.operand);
  }

  return new Uint8Array(bytes);
}

/**
 * Assemble a single line with label support
 */
function assembleLine(instruction: string, labels: Map<string, number>, currentAddr: number): AssembledInstruction {
  instruction = instruction.trim().toUpperCase();

  // Split into mnemonic and operands
  const parts = instruction.split(/[\s,]+/).filter(s => s.length > 0);
  if (parts.length === 0) {
    throw new AssemblerError('Empty instruction');
  }

  const mnemonic = parts[0];
  const operands = parts.slice(1);

  // For jump/branch instructions, resolve label if present
  const isJump = ['JMP', 'JZ', 'JNZ', 'JC', 'JNC', 'JN', 'CALL'].includes(mnemonic);

  if (isJump && operands.length === 1) {
    const operandStr = operands[0];
    // Try to resolve as label
    if (/^[A-Z_][A-Z0-9_]*$/i.test(operandStr)) {
      const labelAddr = labels.get(operandStr.toUpperCase());
      if (labelAddr !== undefined) {
        // Calculate relative offset
        const offset = labelAddr - (currentAddr + 2);
        if (offset < -128 || offset > 127) {
          throw new AssemblerError(`Label ${operandStr} out of range: ${offset}`);
        }
        // Replace operand with calculated offset
        operands[0] = `$${(offset & 0xFF).toString(16).toUpperCase()}`;
      }
    }
  }

  // Now assemble normally (this will use the updated original assemble function)
  const originalInstruction = [mnemonic, ...operands].join(' ');
  return assemble(originalInstruction);
}

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
 * Parse an immediate value supporting multiple formats:
 * - Decimal: 123
 * - Hex: $6E, 0x6E, 0X6E
 * - Binary: 0b1110, 0B1110
 * - Character: 'a', '\n', '\t', '\r', '\0'
 * - Multi-character (for .data): 'abc' (returns array)
 * - High byte: >label or HIGH(label)
 * - Low byte: <label or LOW(label)
 * Can also be a label reference (resolved later)
 */
function parseImmediate(s: string, labels?: Map<string, number>, currentAddr?: number, allowMultiByte: boolean = false): number | number[] {
  const original = s;
  s = s.trim();
  let value: number | number[];

  // Check for high byte operator: >label or HIGH(label)
  if (labels && s.startsWith('>')) {
    const labelName = s.substring(1).trim().toUpperCase();
    const labelAddr = labels.get(labelName);
    if (labelAddr === undefined) {
      throw new AssemblerError(`Undefined label: ${labelName}`);
    }
    return (labelAddr >> 8) & 0xFF;
  }

  if (labels && /^HIGH\s*\(/i.test(s)) {
    const match = s.match(/^HIGH\s*\(\s*([A-Z_][A-Z0-9_]*)\s*\)/i);
    if (!match) {
      throw new AssemblerError(`Invalid HIGH() syntax: ${original}`);
    }
    const labelName = match[1].toUpperCase();
    const labelAddr = labels.get(labelName);
    if (labelAddr === undefined) {
      throw new AssemblerError(`Undefined label: ${labelName}`);
    }
    return (labelAddr >> 8) & 0xFF;
  }

  // Check for low byte operator: <label or LOW(label)
  if (labels && s.startsWith('<')) {
    const labelName = s.substring(1).trim().toUpperCase();
    const labelAddr = labels.get(labelName);
    if (labelAddr === undefined) {
      throw new AssemblerError(`Undefined label: ${labelName}`);
    }
    return labelAddr & 0xFF;
  }

  if (labels && /^LOW\s*\(/i.test(s)) {
    const match = s.match(/^LOW\s*\(\s*([A-Z_][A-Z0-9_]*)\s*\)/i);
    if (!match) {
      throw new AssemblerError(`Invalid LOW() syntax: ${original}`);
    }
    const labelName = match[1].toUpperCase();
    const labelAddr = labels.get(labelName);
    if (labelAddr === undefined) {
      throw new AssemblerError(`Undefined label: ${labelName}`);
    }
    return labelAddr & 0xFF;
  }

  // Check if it's a label reference (case-insensitive)
  if (labels && /^[A-Z_][A-Z0-9_]*$/i.test(s)) {
    const labelAddr = labels.get(s.toUpperCase());
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

  // Character literal(s)
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 3) {
      throw new AssemblerError(`Invalid character literal: ${original}`);
    }
    const content = s.substring(1, s.length - 1);
    const chars: number[] = [];

    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\\' && i + 1 < content.length) {
        // Escape sequence (case-insensitive)
        const nextChar = content[i + 1].toLowerCase();
        switch (nextChar) {
          case '0': chars.push(0); break;
          case 'n': chars.push(10); break;
          case 'r': chars.push(13); break;
          case 't': chars.push(9); break;
          case '\\': chars.push(92); break;
          case "'": chars.push(39); break;
          default:
            throw new AssemblerError(`Invalid escape sequence: \\${content[i + 1]}`);
        }
        i++; // Skip next character
      } else {
        chars.push(content.charCodeAt(i));
      }
    }

    if (chars.length === 0) {
      throw new AssemblerError(`Empty character literal: ${original}`);
    }

    if (chars.length === 1) {
      return chars[0];
    }

    if (allowMultiByte) {
      return chars;
    }

    throw new AssemblerError(`Multi-character literal not allowed here: ${original}`);
  }

  // Hex with $ prefix
  if (s.startsWith('$')) {
    value = parseInt(s.substring(1), 16);
  }
  // Hex with 0x prefix (case-insensitive)
  else if (s.toLowerCase().startsWith('0x')) {
    value = parseInt(s.substring(2), 16);
  }
  // Binary with 0b prefix (case-insensitive)
  else if (s.toLowerCase().startsWith('0b')) {
    value = parseInt(s.substring(2), 2);
  }
  // Decimal
  else {
    value = parseInt(s, 10);
  }

  if (isNaN(value as number)) {
    throw new AssemblerError(`Invalid immediate value: ${original}`);
  }

  // For multi-byte values in .data directive
  if (allowMultiByte && value > 255) {
    // Return as big-endian bytes
    const bytes: number[] = [];
    let v = value as number;
    while (v > 0) {
      bytes.unshift(v & 0xFF);
      v = v >>> 8;
    }
    return bytes.length > 0 ? bytes : [0];
  }

  return value as number;
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
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x10, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI1': {
      if (operands.length !== 1) throw new AssemblerError('LDI1 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x11, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI2': {
      if (operands.length !== 1) throw new AssemblerError('LDI2 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x12, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI3': {
      if (operands.length !== 1) throw new AssemblerError('LDI3 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x13, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI4': {
      if (operands.length !== 1) throw new AssemblerError('LDI4 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x14, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI5': {
      if (operands.length !== 1) throw new AssemblerError('LDI5 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x15, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI6': {
      if (operands.length !== 1) throw new AssemblerError('LDI6 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x16, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI7': {
      if (operands.length !== 1) throw new AssemblerError('LDI7 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x17, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI8': {
      if (operands.length !== 1) throw new AssemblerError('LDI8 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x18, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI9': {
      if (operands.length !== 1) throw new AssemblerError('LDI9 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x19, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI10': {
      if (operands.length !== 1) throw new AssemblerError('LDI10 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x1A, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI11': {
      if (operands.length !== 1) throw new AssemblerError('LDI11 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x1B, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI12': {
      if (operands.length !== 1) throw new AssemblerError('LDI12 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x1C, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI13': {
      if (operands.length !== 1) throw new AssemblerError('LDI13 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x1D, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI14': {
      if (operands.length !== 1) throw new AssemblerError('LDI14 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
      return { opcode: 0x1E, operand: imm & 0xFF, length: 2 };
    }
    case 'LDI15': {
      if (operands.length !== 1) throw new AssemblerError('LDI15 requires 1 operand: #imm');
      const imm = parseImmediate(operands[0]) as number;
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
      const addr = parseImmediate(operands[0]) as number;
      return { opcode: 0x24, operand: addr & 0xFF, length: 2 };
    }

    case 'STORZ': {
      if (operands.length !== 1) {
        throw new AssemblerError('STORZ requires 1 operand: #addr');
      }
      const addr = parseImmediate(operands[0]) as number;
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
      const offset = parseImmediate(operands[0]) as number;
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
      const offset = parseImmediate(operands[0]) as number;
      return { opcode: 0x52, operand: offset & 0xFF, length: 2 };
    }

    case 'JNZ': {
      if (operands.length !== 1) {
        throw new AssemblerError('JNZ requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]) as number;
      return { opcode: 0x53, operand: offset & 0xFF, length: 2 };
    }

    case 'JC': {
      if (operands.length !== 1) {
        throw new AssemblerError('JC requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]) as number;
      return { opcode: 0x54, operand: offset & 0xFF, length: 2 };
    }

    case 'JNC': {
      if (operands.length !== 1) {
        throw new AssemblerError('JNC requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]) as number;
      return { opcode: 0x55, operand: offset & 0xFF, length: 2 };
    }

    case 'JN': {
      if (operands.length !== 1) {
        throw new AssemblerError('JN requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]) as number;
      return { opcode: 0x56, operand: offset & 0xFF, length: 2 };
    }

    case 'CALL': {
      if (operands.length !== 1) {
        throw new AssemblerError('CALL requires 1 operand: offset');
      }
      const offset = parseImmediate(operands[0]) as number;
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
 * Assemble multiple lines with label support and directives
 * Labels are defined with a colon suffix: "loop:"
 * Labels can be referenced in jump instructions: "JMP loop"
 * Directives:
 * - .org 0x500 : Set origin address
 * - .data 1 2 3 : Insert data bytes
 */
export function assembleProgram(lines: string[], startAddr: number = 0): Uint8Array {
  const labels = new Map<string, number>();
  const items: Array<{ type: 'instruction' | 'data', line?: string, data?: number[], addr: number }> = [];

  // First pass: find labels, directives, and calculate addresses
  let addr = startAddr;
  for (const line of lines) {
    let trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith(';') || trimmed.startsWith('//')) {
      continue;
    }

    // Remove inline comments (semicolon or //)
    let commentIndex = trimmed.indexOf(';');
    if (commentIndex < 0) {
      commentIndex = trimmed.indexOf('//');
    }
    if (commentIndex >= 0) {
      trimmed = trimmed.substring(0, commentIndex).trim();
      if (trimmed === '') continue;
    }

    // Check for .org directive
    if (trimmed.toLowerCase().startsWith('.org')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length !== 2) {
        throw new AssemblerError('.org requires one argument: address');
      }
      const newAddr = parseImmediate(parts[1]) as number;
      addr = newAddr;
      continue;
    }

    // Check for .data directive
    if (trimmed.toLowerCase().startsWith('.data')) {
      const dataLine = trimmed.substring(5).trim();
      if (dataLine.length === 0) {
        throw new AssemblerError('.data requires at least one value');
      }

      // Parse data values (handle quoted strings specially)
      const parts: string[] = [];
      let current = '';
      let inQuote = false;

      for (let i = 0; i < dataLine.length; i++) {
        const ch = dataLine[i];
        if (ch === "'" && (i === 0 || dataLine[i - 1] !== '\\')) {
          inQuote = !inQuote;
          current += ch;
        } else if (!inQuote && /\s/.test(ch)) {
          if (current.length > 0) {
            parts.push(current);
            current = '';
          }
        } else {
          current += ch;
        }
      }
      if (current.length > 0) {
        parts.push(current);
      }

      const dataBytes: number[] = [];
      for (const part of parts) {
        const value = parseImmediate(part, undefined, undefined, true);
        if (Array.isArray(value)) {
          dataBytes.push(...value);
        } else {
          dataBytes.push(value & 0xFF);
        }
      }

      items.push({ type: 'data', data: dataBytes, addr });
      addr += dataBytes.length;
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
    items.push({ type: 'instruction', line: trimmed, addr });
    addr += 2; // All instructions are 2 bytes
  }

  // Second pass: assemble instructions with label resolution
  const result: Array<{ addr: number, bytes: number[] }> = [];

  for (const item of items) {
    if (item.type === 'data') {
      result.push({ addr: item.addr, bytes: item.data! });
    } else {
      const assembled = assembleLine(item.line!, labels, item.addr);
      result.push({ addr: item.addr, bytes: [assembled.opcode, assembled.operand] });
    }
  }

  // Find the range of addresses
  if (result.length === 0) {
    return new Uint8Array(0);
  }

  const minAddr = result[0].addr;
  const maxAddr = result[result.length - 1].addr + result[result.length - 1].bytes.length - 1;
  const size = maxAddr - minAddr + 1;

  // Create output buffer
  const output = new Uint8Array(size);

  // Fill in bytes
  for (const item of result) {
    const offset = item.addr - minAddr;
    for (let i = 0; i < item.bytes.length; i++) {
      output[offset + i] = item.bytes[i];
    }
  }

  return output;
}

/**
 * Assemble from a file's contents
 * Returns the assembled bytes and the starting address
 */
export function assembleFile(content: string, defaultStartAddr: number = 0x200): { bytes: Uint8Array, startAddr: number } {
  const lines = content.split('\n');

  // Look for first .org directive to determine start address
  let startAddr = defaultStartAddr;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('.org')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length === 2) {
        startAddr = parseImmediate(parts[1]) as number;
        break;
      }
    }
  }

  const bytes = assembleProgram(lines, startAddr);
  return { bytes, startAddr };
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

  // Resolve high/low byte operators for all instructions
  for (let i = 0; i < operands.length; i++) {
    const op = operands[i];
    // Handle >label (high byte)
    if (op.startsWith('>')) {
      const labelName = op.substring(1).trim().toUpperCase();
      const labelAddr = labels.get(labelName);
      if (labelAddr !== undefined) {
        operands[i] = `$${((labelAddr >> 8) & 0xFF).toString(16).toUpperCase()}`;
      }
    }
    // Handle <label (low byte)
    else if (op.startsWith('<')) {
      const labelName = op.substring(1).trim().toUpperCase();
      const labelAddr = labels.get(labelName);
      if (labelAddr !== undefined) {
        operands[i] = `$${(labelAddr & 0xFF).toString(16).toUpperCase()}`;
      }
    }
    // Handle HIGH(label)
    else if (/^HIGH\s*\(/i.test(op)) {
      const match = op.match(/^HIGH\s*\(\s*([A-Z_][A-Z0-9_]*)\s*\)/i);
      if (match) {
        const labelName = match[1].toUpperCase();
        const labelAddr = labels.get(labelName);
        if (labelAddr !== undefined) {
          operands[i] = `$${((labelAddr >> 8) & 0xFF).toString(16).toUpperCase()}`;
        }
      }
    }
    // Handle LOW(label)
    else if (/^LOW\s*\(/i.test(op)) {
      const match = op.match(/^LOW\s*\(\s*([A-Z_][A-Z0-9_]*)\s*\)/i);
      if (match) {
        const labelName = match[1].toUpperCase();
        const labelAddr = labels.get(labelName);
        if (labelAddr !== undefined) {
          operands[i] = `$${(labelAddr & 0xFF).toString(16).toUpperCase()}`;
        }
      }
    }
  }

  // Now assemble normally (this will use the updated original assemble function)
  const originalInstruction = [mnemonic, ...operands].join(' ');
  return assemble(originalInstruction);
}

# OPER-8 Thoughts & Musings

## Original Goals

I set out to design a CPU that was as "simple" as CHIP-8, but pleasant to code for and powerful enough to drive a fantasy computer on par with the Commodore 64 or Apple II.  I looked at CHIP-8 variants, but none of them quite fit the bill.  So I started with a clean-sheet design.

I wanted to have fixed-width instructions, so that when looking at memory you can always tell where the instructions are, it's easy to know how far to jump to skip an instruction, etc.  I chose an instruction width of 2 because it seemed big enough, 4 seemed too big, and 3 just feels wrong on so many levels.

I liked CHIP-8's use of 16 registers, such that a single nibble can identify a register, and you can fit two register IDs into a byte.  So I took that, but threw out everything else and started fresh.  And, unlike CHIP-8, I tried to dedicate an entire byte to the opcode, leaving the second byte for the operand(s).  Also, apart from PRINT and INPUT, I wanted to remove all I/O (display support, sound, etc.) from the CPU itself -- these seem like things that belong in the "peripheral" hardware, in the VM around the CPU.

## What Worked

The PRINT and INPUT opcodes are really nice.  It's amazingly powerful to be able to write command-line programs in assembler.  Useful for both testing and learning.

The plethora of registers is nice too, though so far it's been more than I ever needed.  With a more complex program, though, I think you could map certain frequently-used variables to permanent registers, for a big boost to speed and simplicity.

While very standard, the C/N/Z flags work really well.  I should have included info about what flags are affected by each instruction in the overview table, but we did manage to get this pretty consistent, and I like the pattern of TEST or CMP followed by a conditional branch on the flags, rather than combined test-and-branch instructions.

The assembler/disassembler and CLI (command-line interface) built for this prototype worked really well, too.  Especially useful was the single-step test feature, which can be used as a command line argument, or you can put a whole bunch of them in a file like [this](tests/basic.txt).

## Problems & Misgivings

I very quickly found that there just wasn't enough operand space for many reasonable operations.  For example, to load an immediate value into a register, I initially had to use two instructions: LDLO and LDHI to load the low and high nibble, respectively.

That sucked, so I caved on this one and defined 16 different LDI (load immediate) instructions, one for each register -- essentially packing the destination register into the opcode byte, just like CHIP-8.

Then, there were several places where we needed to access memory... but we _also_ need a source or destination register.  I was trying to avoid CHIP-8's special `I` register, which feels like a hack; so instead, I defined things like these:

| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $24 | LOADZ | #addr | Load R0 from zero-page [0x00addr] |
| $25 | STORZ | #addr | Store R0 to zero-page [0x00addr] |

...which work only for page 0 (i.e. memory locations 0x0000 - 0x00FF), making that page "special" and easier to access than the rest of memory.  For the rest of memory, I defined:

| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $22 | LOAD | Rx, Ry | Load Rx from address [Ry:Ry+1] |
| $23 | STOR | Rx, Ry | Store Rx to address [Ry:Ry+1] |

This works, but it means that an instruction may use registers that are not explicitly mentioned in the operands (register Y+1 in this case).  That's rather hackish, too.  Here's another example of the same hack:

| Hex | Opcode | Operands | Description |
|-----|--------|----------|-------------|
| $37 | MUL | Rx, Ry | Rx:Rx+1 = Rx * Ry (unsigned, 16-bit result) |
| $38 | DIV | Rx, Ry | Rx = Rx / Ry, Rx+1 = remainder (unsigned) |

Here, it looks like we're multiplying or dividing into Rx, but we're actually affecting Rx+1 as well.

Then, I got to the point in actually programming this thing where I wanted an indexed addressing mode.  In other words: I have an address, and I want to read from some point past that address, for example because I'm iterating over bytes in a string.  Now we need the destination register, the address (two registers), and the offset -- four registers total.  There's simply no way to cram that into two bytes.  I could do it with three operand nibbles if I did the implicit "+1" trick for the address as above, but again, that feels hacky.

At this point, I started considering that maybe CHIP-8 had a good idea with the `I` register.  Have a special wide (16-bit) register whose only job is to represent a memory location — much like the program counter -- and then any memory-accessing opcode no longer needs to encode the memory address as an operand.  That frees up plenty of space for the source/destination register, and also an index register if wanted.

But some operations will still need three registers.  For example, math: if you're multiplying or dividing two 8-bit numbers, you need 16 bits for the result.  Best to do this like DIV Rx, Ry, Rz, which could do something like Rx = Rx / Ry, Rz = Rx % Ry.  To encode that in a two-byte instruction, you need to pack one of the registers into the first byte (just like LDI).

But if we've got an I register and we're packing operands into any nibble of a 2-byte instruction... that's essentially CHIP-8.  I've converged on pretty much the same design.

## Conclusions?

So where does that leave us?  I'm not happy with OPER-8 as it is; it's functional, but not as simple/pleasant to use as I wanted.  I see a few paths forward:

- Make instructions 4 bytes wide.  This leaves plenty of room for operands, but in most cases it is _too_ much room.  The temptation to use the remaining bits for addressing modes, or working with additional registers in parallel, or other such complexity is strong.  At that point we no longer have a RISC chip; it's much more CISC, and it's going to be a pain for a human to code.

- Reduce general-purpose registers to 8.  Now a register ID is only 3 bits.  So a 2-byte instruction could fit 3 register references plus a 7-bit opcode, which is plenty; or 4 register references plus a 4-bit opcode, which is probably not enough.  I'm hating this even as I type it.  But _maaaaybe_ it's worth looking at more carefully.

- Make a CHIP-8 variant.  Since we seem to have converged on essentially the same design, maybe just embrace that, and make yet another CHIP-8 variant to add to [these](https://chip8.gulrak.net/).  Changes I might want to make:
  - Remove display and sound support from the instruction set, using memory-mapped I/O for these instead, so that console/computer designers can make their own choices while using the same CPU chip.  This will simplify the instruction set and also free up opcode space.
  - Remove hex key instructions -- those too should simply be memory-mapped.
  - Add PRINT and INPUT, because good golly these are nice.
  - Ensure the I register can access all 64k of memory.
  - Maybe add an additional memory register (J?), so we can easily & efficiently do things like copy from one area of memory to another?
  - Add the register-management instructions from XO-CHIP, e.g. 5xy2 and 5xy3.
  - Maybe add ways to push/pop registers to/from the stack, too.  (In other CHIP-8 variants, the stack is used *only* for the call return address.)
  - CHIP-8 doesn't have C, N, and Z flags; instead it uses R15 as the single variable-purpose flag register, and has several "skip next instruction if" opcodes.  I don't love it, but I guess I can live with it.
  
Of course if I remove all the key, display, and sound instructions from the instruction set, is it really a CHIP-8 variant?  Probably, though some might disagree.


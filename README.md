# oper-8
simple yet complete 8-bit fantasy CPU


## Motivation

In October 2025, I got seized with the urge to design a simple, general-purpose, 8-bit fantasy CPU chip which could serve as the core for any 80s-era fantasy console or computer.  This came after playing with CHIP-8 (and making my own [CHIP-8 emulator](https://github.com/JoeStrout/minimicro-chip8) a while back), and looking at the many [CHIP-8 variants](https://chip8.gulrak.net/) already out there.

There were a few reasons no off-the-shelf CHIP-8 variant suited my needs:

- No simple text handling at all, e.g. INPUT and PRINT.
- Display features were limited and built right into the instruction set, severely limiting what sort of computer/console you could make with it.
- Ditto for sound, controller input, etc.
- Stock CHIP-8 could only access 4k of RAM, though several variants do expand this to 64k.
  - But in most of those variants, you still can't have more than 3.5k of usable code.

So, I decided to start with a fresh design.

## Status

We have a working emulated CPU called OPER-8.  The TypeScript implementation is found in the [ref_imp_ts](ref_imp_ts/) folder, and includes an assembler, disassembler, and interactive monitor (see its [README](ref_imp_ts/README.md).

See the [OVERVIEW](OVERVIEW.md) for the big picture, and [DETAILS](DETAILS.md) for detailed documentation on every opcode.  Or go look at the [sample programs](ref_imp_ts/tests/).

It all works.  But, I'm not entirely happy with it.  See [MUSINGS](MUSINGS.md).

# `function` htmltokStream

[Documentation Index](../README.md)

```ts
import {htmltokStream} from "https://deno.land/x/htmltok@v2.0.2/mod.ts"
```

`function` htmltokStream(source: ReadableStream\<Uint8Array>, settings: [Settings](../interface.Settings/README.md)=\{}, hierarchy: `string`\[]=\[], tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1, decoder: TextDecoder=defaultDecoder): AsyncGenerator\<[Token](../class.Token/README.md), `void`, `any`>

Returns async iterator over HTML tokens found in source code.
`nLine` and `nColumn` - will start counting lines from these initial values.
`decoder` will use it to convert bytes to text. This function only supports "utf-8", "utf-16le", "utf-16be" and all 1-byte encodings (not "big5", etc.).


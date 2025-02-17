# `function` htmltokStreamArray

[Documentation Index](../README.md)

```ts
import {htmltokStreamArray} from "https://deno.land/x/htmltok@v2.0.2/mod.ts"
```

`function` htmltokStreamArray(source: ReadableStream\<Uint8Array>, settings: [Settings](../interface.Settings/README.md)=\{}, hierarchy: `string`\[]=\[], tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1, decoder: TextDecoder=defaultDecoder): AsyncGenerator\<[Token](../class.Token/README.md)\[], `void`, `any`>

Like `htmltokStream()`, but buffers tokens in array, and yields this array periodically.
This is to avoid creating and awaiting Promises for each Token in the code.


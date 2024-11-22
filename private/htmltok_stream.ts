import {htmltok, Settings, Token, TokenType} from './htmltok.ts';

const BUFFER_SIZE = 16*1024;

const EMPTY_BUFFER = new Uint8Array;
const defaultDecoder = new TextDecoder;

/**	Returns async iterator over HTML tokens found in source code.
	`nLine` and `nColumn` - will start counting lines from these initial values.
	`decoder` will use it to convert bytes to text. This function only supports "utf-8", "utf-16le", "utf-16be" and all 1-byte encodings (not "big5", etc.).
 **/
export async function *htmltokStream(source: ReadableStream<Uint8Array>, settings: Settings={}, hierarchy: string[]=[], tabWidth=4, nLine=1, nColumn=1, decoder=defaultDecoder): AsyncGenerator<Token, void>
{	using reader = new TextReader(source, decoder);
	const it = htmltok(await reader.read(), settings, hierarchy, tabWidth, nLine, nColumn);
	let token;
	while ((token = it.next().value))
	{	while (token.type == TokenType.MORE_REQUEST)
		{	token = it.next(await reader.read()).value;
			if (!token)
			{	return;
			}
		}
		yield token;
	}
}

/**	Like `htmltokReader()`, but buffers tokens in array, and yields this array periodically.
	This is to avoid creating and awaiting Promises for each Token in the code.
	**/
export async function *htmltokStreamArray(source: ReadableStream<Uint8Array>, settings: Settings={}, hierarchy: string[]=[], tabWidth=4, nLine=1, nColumn=1, decoder=defaultDecoder): AsyncGenerator<Token[], void>
{	using reader = new TextReader(source, decoder);
	const it = htmltok(await reader.read(), settings, hierarchy, tabWidth, nLine, nColumn);
	let tokensBuffer = new Array<Token>;
	let token;
	while ((token = it.next().value))
	{	while (token.type == TokenType.MORE_REQUEST)
		{	if (tokensBuffer.length)
			{	yield tokensBuffer;
				tokensBuffer = [];
			}
			token = it.next(await reader.read()).value;
			if (!token)
			{	return;
			}
		}
		tokensBuffer[tokensBuffer.length] = token;
	}
	if (tokensBuffer.length)
	{	yield tokensBuffer;
	}
}

class TextReader
{	#reader: ReadableStreamDefaultReader<Uint8Array>|undefined;
	#readerByob: ReadableStreamBYOBReader|undefined;
	#decoder: TextDecoder;
	#buffer = EMPTY_BUFFER.buffer;

	constructor(input: ReadableStream<Uint8Array>, decoder: TextDecoder)
	{	try
		{	this.#readerByob = input.getReader({mode: 'byob'});
			this.#buffer = new ArrayBuffer(BUFFER_SIZE);
		}
		catch
		{	this.#reader = input.getReader();
		}
		this.#decoder = decoder;
	}

	async read()
	{	const readerByob = this.#readerByob;
		if (readerByob)
		{	while (true)
			{	const {value, done} = await readerByob.read(new Uint8Array(this.#buffer));
				if (done || !value)
				{	return '';
				}
				this.#buffer = value.buffer;
				const text = this.#decoder.decode(value, {stream: true});
				if (text.length)
				{	return text;
				}
			}
		}
		else
		{	const reader = this.#reader!;
			while (true)
			{	const {value, done} = await reader.read();
				if (done || !value)
				{	return '';
				}
				const text = this.#decoder.decode(value, {stream: true});
				if (text.length)
				{	return text;
				}
			}
		}
	}

	[Symbol.dispose]()
	{	this.#decoder.decode(EMPTY_BUFFER); // Clear state (deno requires it)
		this.#reader?.releaseLock();
		this.#readerByob?.releaseLock();
	}
}

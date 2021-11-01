# htmltok - HTML and XML tokenizer and normalizer

This library splits HTML code to semantic units like "beginning of open tag", "attribute name", "attribute value", "comment", etc.
It respects preprocessing instructions (like `<?...?>`), so can be used to implement HTML-based templating languages.

Also this library can tokenize XML markup. However it's HTML5-centric. When decoding named entities, HTML5 ones will be recognized and decoded (however decoding is beyond tokenization, and happens only when you call `Token.getValue()`).

During tokenization, this library finds errors in markup, like not closed tags, duplicate attribute names, etc., and suggests fixes. It can be used to convert HTML to canonical form.

## Example

```ts
import {htmltok, TokenType} from 'https://deno.land/x/htmltok@v0.0.2/mod.ts';

const source =
`	<meta name=viewport content="width=device-width, initial-scale=1.0">
	<div title="&quot;Title&quot;">
		Text.
	</div>
`;
for (const token of htmltok(source))
{	console.log(token.debug());
	if (token.type == TokenType.ATTR_VALUE)
	{	console.log(`Attribute value: ${token.getValue()}`);
	}
}
```

Prints:

```javascript
{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\t"}
{nLine: 1,  nColumn: 5,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<meta"}
{nLine: 1,  nColumn: 10, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "}
{nLine: 1,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "name"}
{nLine: 1,  nColumn: 15, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="}
{nLine: 1,  nColumn: 16, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "viewport"}
Attribute value: viewport
{nLine: 1,  nColumn: 24, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "}
{nLine: 1,  nColumn: 25, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "content"}
{nLine: 1,  nColumn: 32, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="}
{nLine: 1,  nColumn: 33, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"width=device-width, initial-scale=1.0\""}
Attribute value: width=device-width, initial-scale=1.0
{nLine: 1,  nColumn: 72, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"}
{nLine: 1,  nColumn: 73, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n\t"}
{nLine: 2,  nColumn: 5,  level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<div"}
{nLine: 2,  nColumn: 9,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "}
{nLine: 2,  nColumn: 10, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "title"}
{nLine: 2,  nColumn: 15, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="}
{nLine: 2,  nColumn: 16, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"&quot;Title&quot;\""}
Attribute value: "Title"
{nLine: 2,  nColumn: 35, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"}
{nLine: 2,  nColumn: 36, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n\t\tText.\n\t"}
{nLine: 4,  nColumn: 5,  level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</div>"}
{nLine: 4,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "\n"}
{nLine: 4,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n"}
```

## htmltok() - Tokenize string

This function returns iterator over tokens found in given HTML source string.

```ts
function htmltok(source: string, settings: Settings={}, hierarchy: string[]=[], tabWidth=4, nLine=1, nColumn=1): Generator<Token, void, string|undefined>;

interface Settings
{	mode?: 'html' | 'xml';
	noCheckAttributes?: boolean;
	quoteAttributes?: boolean;
	unquoteAttributes?: boolean;
}

class Token
{	text: string;
	type: TokenType;
	nLine: number;
	nColumn: number;
	level: number;
	tagName: string;
	isSelfClosing: boolean;
	isForeign: boolean;
}

const enum TokenType
{	TEXT,
	CDATA,
	ENTITY,
	COMMENT,
	DTD,
	PI,
	TAG_OPEN_BEGIN,
	TAG_OPEN_SPACE,
	ATTR_NAME,
	ATTR_EQ,
	ATTR_VALUE,
	TAG_OPEN_END,
	TAG_CLOSE,
	RAW_LT,
	RAW_AMP,
	JUNK,
	JUNK_DUP_ATTR_NAME,
	FIX_STRUCTURE_TAG_OPEN,
	FIX_STRUCTURE_TAG_OPEN_SPACE,
	FIX_STRUCTURE_TAG_CLOSE,
	FIX_STRUCTURE_ATTR_QUOT,
	MORE_REQUEST,
}
```

`htmltok()` arguments:

- `source` - HTML or XML string.
- `settings` - Affects how the code will be parsed.
- `hierarchy` - If you pass an array object, this object will be modified during tokenization process - after yielding each next token. In this array you can observe current elements nesting hierarchy. For normal operation you need to pass empty array, but if you resume parsing from some point, you can provide initial hierarchy. All tag names here are lowercased.
- `tabWidth` - Width of TAB stops. Affects `nColumn` of returned tokens.
- `nLine` - Will start counting lines from this line number.
- `nColumn` - Will start counting lines (and columns) from this column number.

This function returns `Token` iterator.

Before giving the last token in the source, this function generates `TokenType.MORE_REQUEST`.
You can ignore it, or you can react by calling the following `it.next(more)` function of the iterator with a string argument, that contains code continuation.
In this case this code will be appended to the last token, and the tokenization process will continue.

```ts
import {htmltok, TokenType} from 'https://deno.land/x/htmltok@v0.0.2/mod.ts';

let source =
`	<meta name=viewport content="width=device-width, initial-scale=1.0">
	<div title="&quot;Title&quot;">
		Text.
	</div>
`;

function read()
{	const part = source.slice(0, 10);
	source = source.slice(10);
	return part;
}

const it = htmltok(read());
let token;
L:while ((token = it.next().value))
{	while (token.type == TokenType.MORE_REQUEST)
	{	token = it.next(read()).value;
		if (!token)
		{	break L;
		}
	}

	console.log(token.debug());
}
```

## Token

```ts
class Token
{	constructor
	(	public text: string,
		public type: TokenType,
		public nLine = 1,
		public nColumn = 1,
		public level = 0,
		public tagName = '',
		public isSelfClosing = false,
		public isForeign = false,
	){}

	toString(): string;
	normalized(): string;
	debug(): string;
	getValue(): string;
}
```

- `text` - original HTML or XML token text.
- `type` - Token type.
- `nLine` - Line number where this token starts.
- `nColumn` - Column number on the line where this token starts.
- `level` - Tag nesting level.
- `tagName` - is set on `TokenType.TAG_OPEN_BEGIN`, `TokenType.TAG_CLOSE`, `TokenType.FIX_STRUCTURE_TAG_OPEN` and `TokenType.FIX_STRUCTURE_TAG_CLOSE`. Lowercased tag name.
- `isSelfClosing` - is set only on `TokenType.TAG_OPEN_END`. `true` if this tag is one of `area`, `base`, `br`, `col`, `command`, `embed`, `hr`, `img`, `input`, `keygen`, `link`, `menuitem`, `meta`, `param`, `source`, `track`, `wbr`. `Token.text` can be `>` or `/>`, as appears in the source. Also it's set to `true` in foreign (XML) tags that use `/>` to self-close the tag. If `/>` is used in a regular HTML tag, not from the list above, the `/` character is treated as `TokenType.JUNK`.
- `isForeign` - When parsing in HTML mode (`Settings.mode !== 'xml'`), this flag is set on each token inside `<svg>` and `<math>` tags. In XML mode it's always set.

`toString()` method returns original token (`Token.text`), except for `TokenType.MORE_REQUEST` and `FIX_STRUCTURE_*` token types, for which it returns empty string.

`normalized()` - returns token text, as it's suggested according to HTML normalization rules.
- For `TokenType.JUNK` and `TokenType.JUNK_DUP_ATTR_NAME` it returns empty string (unlike in `toString()`).
- For `TokenType.RAW_LT` it returns `&lt;` (`toString()` would return `<`).
- For `TokenType.RAW_AMP` it returns `&amp;` (`toString()` would return `&`).
- For `TokenType.MORE_REQUEST` returns empty string.
- For other token types it returns `Token.text`.

`debug()` - returns `Token` object stringified for `console.log()`.

`getValue()` - returns decoded value of the token.
- For `TokenType.CDATA` it returns the containing text (without `<![CDATA[` and `]]>`).
- For `TokenType.COMMENT` it returns the containing text (without `<!--` and `-->`).
- For `TokenType.PI` it returns the containing text (without `<?` and `?>`).
- For `TokenType.TAG_OPEN_BEGIN`, `TokenType.TAG_CLOSE`, `TokenType.FIX_STRUCTURE_TAG_OPEN` and `TokenType.FIX_STRUCTURE_TAG_CLOSE` it returns lowercased tag name (the same as `Token.tagName`).
- For `TokenType.ENTITY` it returns the decoded value of the entity. In both HTML and XML, it understands only standard HTML5 entity names.
- For `TokenType.ATTR_VALUE` it returns the entity-decoded value of the attribute, without markup quotes (if used).
- For `TokenType.RAW_LT` it returns `<`.
- For `TokenType.RAW_AMP` it returns `&`.
- For `TokenType.JUNK`, `TokenType.JUNK_DUP_ATTR_NAME` and `TokenType.MORE_REQUEST` it returns empty string.
- For other token types it returns `Token.text`.

## TokenType

```ts
const enum TokenType
{	TEXT,
	CDATA,
	ENTITY,
	COMMENT,
	DTD,
	PI,
	TAG_OPEN_BEGIN,
	TAG_OPEN_SPACE,
	ATTR_NAME,
	ATTR_EQ,
	ATTR_VALUE,
	TAG_OPEN_END,
	TAG_CLOSE,
	RAW_LT,
	RAW_AMP,
	JUNK,
	JUNK_DUP_ATTR_NAME,
	FIX_STRUCTURE_TAG_OPEN,
	FIX_STRUCTURE_TAG_OPEN_SPACE,
	FIX_STRUCTURE_TAG_CLOSE,
	FIX_STRUCTURE_ATTR_QUOT,
	MORE_REQUEST,
}
```

- `TEXT` - Text (character data). It doesn't contain entities and preprocessing instructions, as they are returned as separate tokens.
- `CDATA` - The CDATA block, like `<![CDATA[...]]>`. It can occure in XML mode (`Settings.mode === 'xml'`), and in `svg` and `math` elements in HTML mode. In other places `<![CDATA[...]]>` is returned as `TokenType.JUNK`. This token **can** contain preprocessing instructions in it's `Token.text`.
- `ENTITY` - One character reference, like `&apos;`, `&#39;` or `&#x27;`. This token also **can** contain preprocessing instructions in it's `Token.text`, like `&a<?...?>o<?...?>;`.
- `COMMENT` - HTML comment, like `<!--...-->`. It **can** contain preprocessing instructions.
- `DTD` - Document type declaration, like `<!...>`. It **can** contain preprocessing instructions.
- `PI` - Preprocessing instruction, like `<?...?>`.
- `TAG_OPEN_BEGIN` - `<` char followed by tag name, like `<script`. Tag name **can** contain preprocessing instructions, like `<sc<?...?>ip<?...?>`. `Token.tagName` contains lowercased tag name.
- `TAG_OPEN_SPACE` - Any number of whitespace characters (can include newline chars) inside opening tag markup. It separates tag name and attributes, and can occure between attributes, and at the end of opening tag.
- `ATTR_NAME` - Attribute name. It **can** contain preprocessing instructions, like `a<?...?>b<?...?>`.
- `ATTR_EQ` - `=` char after attribute name. It's always followed by `ATTR_VALUE` (optionally preceded by `TAG_OPEN_SPACE`). If `=` is not followed by attribute value, it's returned as `TokenType.JUNK`.
- `ATTR_VALUE` - Attribute value. It can be quoted in `"` or `'`, or it can be unquoted. This token type **can** contain entities and preprocessing instructions, like `"a<?...?>&lt;<?...?>"`. `Token.getValue()` returns unquoted text with decoded entities, but preprocessing instructions are left intact.
- `TAG_OPEN_END` - `>` or `/>` chars that terminate opening tag. `Token.isSelfClosing` indicates whether this tag doesn't have corresponding closing tag.
- `TAG_CLOSE` - Closing tag token, like `</script >`. It **can** contain preprocessing instructions, like `</sc<?...?>ip<?...?>>`.
- `RAW_LT` - `<` char, that is not part of markup (just appears in text). Typically you want to convert it to `&lt;`.
- `RAW_AMP` - `&` char, that is not part of markup (just appears in text). Typically you want to convert it to `&amp;`.
- `JUNK` - characters that are not in place. Typically you want to remove them. This token type can appear in the following situations:
  - Characters in opening tag, that can't be interpreted as attributes. For example repeating `=` char, or `/` at the end of opening tag, which must have corresponding closing tag.
  - Unnecessary quotes around attribute value, if requested to unquote attributes.
  - Attribute values of duplicate attributes.
  - Closing tag, that was not opened.
  - CDATA not in XML or foreign tags.
- `JUNK_DUP_ATTR_NAME` - name of duplicate attribute.
- `FIX_STRUCTURE_TAG_OPEN` - `FIX_STRUCTURE_*` token types don't represent text in source code, but are generated by the tokenizer to suggest markup fixes. `FIX_STRUCTURE_TAG_OPEN` is automatically inserted opening tag, like `<b>`. Token text cannot contain preprocessing instructions. Consider the following markup: `<b>BOLD<u>BOLD-UND</b>UND</u>` many browsers will interpret this as `<b>BOLD<u>BOLD-UND</u></b><u>UND</u>`. Also this tokenizer will suggest `</u>` as `FIX_STRUCTURE_TAG_CLOSE`, and `<u>` as `FIX_STRUCTURE_TAG_OPEN`.
- `FIX_STRUCTURE_TAG_OPEN_SPACE` - one space character that is suggested between attributes in situations like `<meta name="name"content="content">`.
- `FIX_STRUCTURE_TAG_CLOSE` - autogenerated closing tag, like `</td>`. It's generated when closing tag is missing in the source markup.
- `FIX_STRUCTURE_ATTR_QUOT` - one autogenerated quote character to surround attribute value, if `Settings.quoteAttributes` was requested, or when `Settings.mode === 'xml'`.
- `MORE_REQUEST` - Before returning the last token found in the source string, `htmltok()` generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.

## Settings

```ts
interface Settings
{	mode?: 'html' | 'xml';
	noCheckAttributes?: boolean;
	quoteAttributes?: boolean;
	unquoteAttributes?: boolean;
}
```

- `mode` - tokenize in either HTML, or XML mode. In XML mode, tag and attribute names are case-sensitive, and there's no special treatment for tags like `<script>`, `<style>`, `<textarea>` and `<title>`. Also there're no self-closing by definition tags, and `/>` can be used in any tag to make it self-closing. Also XML mode implies `Settings.quoteAttributes`.
- `noCheckAttributes` - If `true`, will not try to determine duplicate attribute names. This can save some computing resources.
- `quoteAttributes` - If `true`, will generate `TokenType.FIX_STRUCTURE_ATTR_QUOT` tokens to suggest quotes around unquoted attribute values.
- `unquoteAttributes` - If `true`, will return quotes around attribute values as `TokenType.JUNK`, if such quotes are not necessary. HTML5 standard allows unquoted attributes (unlike XML), and removing quotes can make markup lighter, and more readable by humans and robots.

## Preprocessing instructions

This tokenizer allows you to make template parsers that will utilize "preprocessing instructions" feature of XML-like markup languages.
However there's one limitation. The PIs must not cross markup boundaries.

If you want to execute preprocessing instructions before parsing markup, it's very simple to do, and you don't need `htmltok` for this (just `str.replace(/<\?.*?\?>/g, exec)`).
Creating parsers that first recognize the markup structure, and maybe split it, and execute PIs in later steps, requires to deal with PIs as part of markup, and `htmltok` can help here.

The following is code that has inter-markup PIs, and it's not suitable for `htmltok`:

```html
<!-- Crosses markup boundaries -->
<?='<div'?> id="main"></div>
```
The following is alright:

```html
<!-- Doesn't cross markup boundaries -->
<<?='div'?> id="main"></<?='div'?>>
```

## htmltokReader() - Tokenize Deno.Reader

This function allows to tokenize a `Deno.Reader` stream of HTML or XML source code.
It never generates `TokenType.MORE_REQUEST`.

```ts
async function *htmltokReader(source: string, settings: Settings={}, hierarchy: string[]=[], tabWidth=4, nLine=1, nColumn=1, decoder=defaultDecoder): AsyncGenerator<Token, void>;
```

If `decoder` is provided, will use it to convert bytes to text. This function only supports "utf-8", "utf-16le", "utf-16be" and all 1-byte encodings (not "big5", etc.).

```ts
import {htmltokReader} from 'https://deno.land/x/htmltok@v0.0.2/mod.ts';
import {readerFromStreamReader} from "https://deno.land/std@0.113.0/io/mod.ts";

const res = await fetch("https://example.com/");
const reader = readerFromStreamReader(res.body!.getReader());
for await (const token of htmltokReader(reader))
{	console.log(token.debug());
}
```

## htmltokReaderArray() - Tokenize Deno.Reader and yield arrays of tokens

This function works like `htmltokReader()`, but buffers tokens in array, and yields this array periodically.
This is to avoid creating and awaiting Promises for each Token in the code.

```ts
async function *htmltokReaderArray(source: string, settings: Settings={}, hierarchy: string[]=[], tabWidth=4, nLine=1, nColumn=1, decoder=defaultDecoder): AsyncGenerator<Token[], void>;
```

```ts
import {htmltokReaderArray} from 'https://deno.land/x/htmltok@v0.0.2/mod.ts';
import {readerFromStreamReader} from "https://deno.land/std@0.113.0/io/mod.ts";

const res = await fetch("https://example.com/");
const reader = readerFromStreamReader(res.body!.getReader());
for await (const tokens of htmltokReaderArray(reader))
{	for (const token of tokens)
	{	console.log(token.debug());
	}
}
```

## htmlDecode() - Decode HTML5 entities

```ts
function htmlDecode(str: string, skipPi=false): string
```

This function decodes entities (character references), like `&apos;`, `&#39;` or `&#x27;`.
If `skipPi` is `true`, it will operate only on parts between preprocessing instructions.

```ts
import {htmlDecode} from 'https://deno.land/x/htmltok@v0.0.2/mod.ts';

console.log(htmlDecode(`Text&amp;text<?&amp;?>text`)); // prints: Text&text<?&?>text
console.log(htmlDecode(`Text&amp;text<?&amp;?>text`, true)); // prints: Text&text<?&amp;?>text
```

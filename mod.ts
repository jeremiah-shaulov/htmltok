/**	This library splits HTML code to semantic units like "beginning of open tag", "attribute name", "attribute value", "comment", etc.
	It respects preprocessing instructions (like `<?...?>`), so can be used to implement HTML-based templating languages.

	Also this library can tokenize XML markup.
	However it's HTML5-centric.
	When decoding named entities, HTML5 ones will be recognized and decoded (however decoding is beyond tokenization, and happens only when you call `Token.getValue()`).

	During tokenization, this library finds errors in markup, like not closed tags, duplicate attribute names, etc., and suggests fixes.
	It can be used to convert HTML to canonical form.

	## Example

	```ts
	// To run this example:
	// deno run example.ts

	import {htmltok, TokenType} from './mod.ts';

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

	{@linkcode htmltok}

	This function returns iterator over tokens found in given HTML source string.

	`htmltok()` arguments:

	- `source` - HTML or XML string.
	- `settings` - Affects how the code will be parsed.
	- `hierarchy` - If you pass an array object, this object will be modified during tokenization process - after yielding each next token. In this array you can observe current elements nesting hierarchy. For normal operation you need to pass empty array, but if you resume parsing from some point, you can provide initial hierarchy. All tag names here are lowercased.
	- `tabWidth` - Width of TAB stops. Affects `nColumn` of returned tokens.
	- `nLine` - Will start counting lines from this line number.
	- `nColumn` - Will start counting lines (and columns) from this column number.

	This function returns {@link Token} iterator.

	Before giving the last token in the source, this function generates {@link TokenType.MORE_REQUEST}.
	You can ignore it, or you can react by calling the following `it.next(more)` function of the iterator with a string argument, that contains code continuation.
	In this case this code will be appended to the last token, and the tokenization process will continue.

	```ts
	// To run this example:
	// deno run example.ts

	import {htmltok, TokenType} from './mod.ts';

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

	{@linkcode Token}

	- `text` - original HTML or XML token text.
	- `type` - Token type.
	- `nLine` - Line number where this token starts.
	- `nColumn` - Column number on the line where this token starts.
	- `level` - Tag nesting level.
	- `tagName` - is set on {@link TokenType.TAG_OPEN_BEGIN}, {@link TokenType.TAG_CLOSE}, {@link TokenType.ATTR_NAME}, {@link TokenType.ATTR_VALUE}, {@link TokenType.FIX_STRUCTURE_TAG_OPEN} and {@link TokenType.FIX_STRUCTURE_TAG_CLOSE}. Lowercased tag name.
	- `isSelfClosing` - is set only on {@link TokenType.TAG_OPEN_END}. `true` if this tag is one of `area`, `base`, `br`, `col`, `command`, `embed`, `hr`, `img`, `input`, `keygen`, `link`, `menuitem`, `meta`, `param`, `source`, `track`, `wbr`. {@link Token.text} can be `>` or `/>`, as appears in the source. Also it's set to `true` in foreign (XML) tags that use `/>` to self-close the tag. If `/>` is used in a regular HTML tag, not from the list above, the `/` character is treated as {@link TokenType.JUNK}.
	- `isForeign` - When parsing in HTML mode ({@link Settings.mode} !== 'xml'), this flag is set on each token inside `<svg>` and `<math>` tags. In XML mode it's always set.

	{@link Token.toString()} method returns original token ({@link Token.text}), except for {@link TokenType.MORE_REQUEST} and `FIX_STRUCTURE_*` token types, for which it returns empty string.

	{@link Token.normalized()} - returns token text, as it's suggested according to HTML normalization rules.
	- For {@link TokenType.JUNK} and {@link TokenType.JUNK_DUP_ATTR_NAME} it returns empty string (unlike in {@link Token.toString()}).
	- For {@link TokenType.RAW_LT} it returns `&lt;` ({@link Token.toString()} would return `<`).
	- For {@link TokenType.RAW_AMP} it returns `&amp;` ({@link Token.toString()} would return `&`).
	- For {@link TokenType.MORE_REQUEST} returns empty string.
	- For other token types it returns {@link Token.text}.

	{@link Token.debug()} - returns {@link Token} object stringified for `console.log()`.

	{@link Token.getValue()} - returns decoded value of the token.
	- For {@link TokenType.CDATA} it returns the containing text (without `<![CDATA[` and `]]>`).
	- For {@link TokenType.COMMENT} it returns the containing text (without `<!--` and `-->`).
	- For {@link TokenType.PI} it returns the containing text (without `<?` and `?>`).
	- For {@link TokenType.TAG_OPEN_BEGIN}, {@link TokenType.TAG_CLOSE}, {@link TokenType.FIX_STRUCTURE_TAG_OPEN} and {@link TokenType.FIX_STRUCTURE_TAG_CLOSE} it returns lowercased (if not XML and there're no preprocessing instructions) tag name (the same as {@link Token.tagName}).
	- For {@link TokenType.ENTITY} it returns the decoded value of the entity. In both HTML and XML, it understands only standard HTML5 entity names.
	- For {@link TokenType.ATTR_NAME} it returns lowercased (if not XML and there're no preprocessing instructions) attribute name.
	- For {@link TokenType.ATTR_VALUE} it returns the entity-decoded value of the attribute, without markup quotes (if used).
	- For {@link TokenType.RAW_LT} it returns `<`.
	- For {@link TokenType.RAW_AMP} it returns `&`.
	- For {@link TokenType.JUNK}, {@link TokenType.JUNK_DUP_ATTR_NAME} and {@link TokenType.MORE_REQUEST} it returns empty string.
	- For other token types it returns {@link Token.text}.

	## TokenType

	{@linkcode TokenType}

	- {@link TokenType.TEXT} - Text (character data). It doesn't contain entities and preprocessing instructions, as they are returned as separate tokens.
	- {@link TokenType.CDATA} - The CDATA block, like `<![CDATA[...]]>`. It can occure in XML mode (`Settings.mode === 'xml'`), and in `svg` and `math` elements in HTML mode. In other places `<![CDATA[...]]>` is returned as {@link TokenType.JUNK}. This token **can** contain preprocessing instructions in it's {@link Token.text}.
	- {@link TokenType.ENTITY} - One character reference, like `&apos;`, `&#39;` or `&#x27;`. This token also **can** contain preprocessing instructions in it's {@link Token.text}, like `&a<?...?>o<?...?>;`.
	- {@link TokenType.COMMENT} - HTML comment, like `<!--...-->`. It **can** contain preprocessing instructions.
	- {@link TokenType.DTD} - Document type declaration, like `<!...>`. It **can** contain preprocessing instructions.
	- {@link TokenType.PI} - Preprocessing instruction, like `<?...?>`.
	- {@link TokenType.TAG_OPEN_BEGIN} - `<` char followed by tag name, like `<script`. Tag name **can** contain preprocessing instructions, like `<sc<?...?>ip<?...?>`. {@link Token.tagName} contains lowercased (if not XML and there're no preprocessing instructions) tag name.
	- {@link TokenType.TAG_OPEN_SPACE} - Any number of whitespace characters (can include newline chars) inside opening tag markup. It separates tag name and attributes, and can occure between attributes, and at the end of opening tag.
	- {@link TokenType.ATTR_NAME} - Attribute name. It **can** contain preprocessing instructions, like `a<?...?>b<?...?>`. `Token.getValue()` returns lowercased (if not XML and there're no preprocessing instructions) attribute name.
	- {@link TokenType.ATTR_EQ} - `=` char after attribute name. It's always followed by {@link TokenType.ATTR_VALUE} (optionally preceded by {@link TokenType.TAG_OPEN_SPACE}). If `=` is not followed by attribute value, it's returned as {@link TokenType.JUNK}.
	- {@link TokenType.ATTR_VALUE} - Attribute value. It can be quoted in `"` or `'`, or it can be unquoted. This token type **can** contain entities and preprocessing instructions, like `"a<?...?>&lt;<?...?>"`. {@link Token.getValue()} returns unquoted text with decoded entities, but preprocessing instructions are left intact.
	- {@link TokenType.TAG_OPEN_END} - `>` or `/>` chars that terminate opening tag. {@link Token.isSelfClosing} indicates whether this tag doesn't have corresponding closing tag.
	- {@link TokenType.TAG_CLOSE} - Closing tag token, like `</script >`. It **can** contain preprocessing instructions, like `</sc<?...?>ip<?...?>>`.
	- {@link TokenType.RAW_LT} - `<` char, that is not part of markup (just appears in text). Typically you want to convert it to `&lt;`.
	- {@link TokenType.RAW_AMP} - `&` char, that is not part of markup (just appears in text). Typically you want to convert it to `&amp;`.
	- {@link TokenType.JUNK} - Characters that are not in place. Typically you want to remove them. This token type can appear in the following situations:
		- Characters in opening tag, that can't be interpreted as attributes. For example repeating `=` char, or `/` at the end of opening tag, which must have corresponding closing tag.
		- Unnecessary quotes around attribute value, if requested to unquote attributes.
		- Attribute values of duplicate attributes.
		- Closing tag, that was not opened.
		- CDATA not in XML or foreign tags.
	- {@link TokenType.JUNK_DUP_ATTR_NAME} - Name of duplicate attribute.
	- {@link TokenType.FIX_STRUCTURE_TAG_OPEN} - `FIX_STRUCTURE_*` token types don't represent text in source code, but are generated by the tokenizer to suggest markup fixes. `FIX_STRUCTURE_TAG_OPEN` is automatically inserted opening tag, like `<b>`. Token text cannot contain preprocessing instructions. Consider the following markup: `<b>BOLD<u>BOLD-UND</b>UND</u>` many browsers will interpret this as `<b>BOLD<u>BOLD-UND</u></b><u>UND</u>`. Also this tokenizer will suggest `</u>` as {@link TokenType.FIX_STRUCTURE_TAG_CLOSE}, and `<u>` as {@link TokenType.FIX_STRUCTURE_TAG_OPEN}.
	- {@link TokenType.FIX_STRUCTURE_TAG_OPEN_SPACE} - One space character that is suggested between attributes in situations like `<meta name="name"content="content">`.
	- {@link TokenType.FIX_STRUCTURE_TAG_CLOSE} - Autogenerated closing tag, like `</td>`. It's generated when closing tag is missing in the source markup.
	- {@link TokenType.FIX_STRUCTURE_ATTR_QUOT} - One autogenerated quote character to surround attribute value, if `Settings.quoteAttributes` was requested, or when `Settings.mode === 'xml'`.
	- {@link TokenType.MORE_REQUEST} - Before returning the last token found in the source string, {@link htmltok()} generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.

	## Settings

	{@linkcode Settings}

	- `mode` - Tokenize in either HTML, or XML mode. In XML mode, tag and attribute names are case-sensitive, and there's no special treatment for tags like `<script>`, `<style>`, `<textarea>` and `<title>`. Also there're no self-closing by definition tags, and `/>` can be used in any tag to make it self-closing. Also XML mode implies {@link Settings.quoteAttributes}.
	- `noCheckAttributes` - If `true`, will not try to determine duplicate attribute names. This can save some computing resources.
	- `quoteAttributes` - If `true`, will generate {@link TokenType.FIX_STRUCTURE_ATTR_QUOT} tokens to suggest quotes around unquoted attribute values.
	- `unquoteAttributes` - If `true`, will return quotes around attribute values as {@link TokenType.JUNK}, if such quotes are not necessary. HTML5 standard allows unquoted attributes (unlike XML), and removing quotes can make markup lighter, and more readable by humans and robots.

	## HTML normalization

	{@link htmltok()} can be used to normalize HTML, that is, to fix markup errors. This includes closing unclosed tags, quoting attributes (in XML or if {@link Settings.quoteAttributes} is set), etc.

	```ts
	import {htmltok} from './mod.ts';

	const html = `<a target=_blank>Click here`;
	const normalHtml = [...htmltok(html, {quoteAttributes: true})].map(t => t.normalized()).join('');
	console.log(normalHtml);
	```

	Prints:

	```html
	<a target="_blank">Click here</a>
	```

	## Preprocessing instructions

	This tokenizer allows you to make template parsers that will utilize "preprocessing instructions" feature of XML-like markup languages.
	However there's one limitation. The PIs must not cross markup boundaries.

	If you want to execute preprocessing instructions before parsing markup, it's very simple to do, and you don't need `htmltok` for this (just `str.replace(/<\?[\S\s]*?\?>/g, exec)`).
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

	## htmltokStream() - Tokenize ReadableStream<Uint8Array>

	{@linkcode htmltokStream}

	This function allows to tokenize a `ReadableStream<Uint8Array>` stream of HTML or XML source code.
	It never generates {@link TokenType.MORE_REQUEST}.

	If `decoder` is provided, will use it to convert bytes to text.

	```ts
	import {htmltokReader} from './mod.ts';
	import {readerFromStreamReader} from 'https://deno.land/std@0.167.0/streams/reader_from_stream_reader.ts';

	const res = await fetch("https://example.com/");
	const reader = readerFromStreamReader(res.body!.getReader());
	for await (const token of htmltokReader(reader))
	{	console.log(token.debug());
	}
	```

	## htmlDecode() - Decode HTML5 entities

	{@linkcode htmlDecode}

	This function decodes entities (character references), like `&apos;`, `&#39;` or `&#x27;`.
	If `skipPi` is `true`, it will operate only on parts between preprocessing instructions.

	```ts
	import {htmlDecode} from './mod.ts';

	console.log(htmlDecode(`Text&amp;text<?&amp;?>text`)); // prints: Text&text<?&?>text
	console.log(htmlDecode(`Text&amp;text<?&amp;?>text`, true)); // prints: Text&text<?&amp;?>text
	```

	@module
	@summary htmltok - HTML and XML tokenizer and normalizer
 **/

export {htmltok, Token, TokenType} from './private/htmltok.ts';
export {htmltokStream, htmltokStreamArray} from './private/htmltok_stream.ts';
export type {Settings} from './private/htmltok.ts';
export {htmlDecode} from './private/entities.ts';

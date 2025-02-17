<!--
	This file is generated with the following command:
	deno run --allow-all https://raw.githubusercontent.com/jeremiah-shaulov/tsa/v0.0.50/tsa.ts doc-md --outFile=README.md --outUrl=https://raw.githubusercontent.com/jeremiah-shaulov/htmltok/v2.0.2/README.md --importUrl=https://deno.land/x/htmltok@v2.0.2/mod.ts mod.ts
-->

# htmltok - HTML and XML tokenizer and normalizer

[Documentation Index](generated-doc/README.md)

This library splits HTML code to semantic units like "beginning of open tag", "attribute name", "attribute value", "comment", etc.
It respects preprocessing instructions (like `<?...?>`), so can be used to implement HTML-based templating languages.

Also this library can tokenize XML markup.
However it's HTML5-centric.
When decoding named entities, HTML5 ones will be recognized and decoded (however decoding is beyond tokenization, and happens only when you call `Token.getValue()`).

During tokenization, this library finds errors in markup, like not closed tags, duplicate attribute names, etc., and suggests fixes.
It can be used to convert HTML to canonical form.

## Example

```ts
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/htmltok/v2.0.2/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-p9mn>/' > /tmp/example-p9mn.ts
// deno run /tmp/example-p9mn.ts

import {htmltok, TokenType} from 'https://deno.land/x/htmltok@v2.0.2/mod.ts';
import {assertEquals} from 'jsr:@std/assert@1.0.7/equals';

const source =
`	<meta name=viewport content="width=device-width, initial-scale=1.0">
	<div title="&quot;Title&quot;">
		Text.
	</div>
`;

assertEquals
(	[...htmltok(source)].map(v => Object.assign<Record<never, never>, unknown>({}, v)),
	[	{nLine: 1,  nColumn: 1,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\t"},
		{nLine: 1,  nColumn: 5,  level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<meta"},
		{nLine: 1,  nColumn: 10, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
		{nLine: 1,  nColumn: 11, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "name"},
		{nLine: 1,  nColumn: 15, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
		{nLine: 1,  nColumn: 16, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "viewport"},
		{nLine: 1,  nColumn: 24, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
		{nLine: 1,  nColumn: 25, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "content"},
		{nLine: 1,  nColumn: 32, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
		{nLine: 1,  nColumn: 33, level: 0, tagName: "meta",    isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"width=device-width, initial-scale=1.0\""},
		{nLine: 1,  nColumn: 72, level: 0, tagName: "",        isSelfClosing: true,  isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
		{nLine: 1,  nColumn: 73, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n\t"},
		{nLine: 2,  nColumn: 5,  level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_BEGIN,               text: "<div"},
		{nLine: 2,  nColumn: 9,  level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_SPACE,               text: " "},
		{nLine: 2,  nColumn: 10, level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.ATTR_NAME,                    text: "title"},
		{nLine: 2,  nColumn: 15, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.ATTR_EQ,                      text: "="},
		{nLine: 2,  nColumn: 16, level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.ATTR_VALUE,                   text: "\"&quot;Title&quot;\""},
		{nLine: 2,  nColumn: 35, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TAG_OPEN_END,                 text: ">"},
		{nLine: 2,  nColumn: 36, level: 1, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n\t\tText.\n\t"},
		{nLine: 4,  nColumn: 5,  level: 0, tagName: "div",     isSelfClosing: false, isForeign: false, type: TokenType.TAG_CLOSE,                    text: "</div>"},
		{nLine: 4,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.MORE_REQUEST,                 text: "\n"},
		{nLine: 4,  nColumn: 11, level: 0, tagName: "",        isSelfClosing: false, isForeign: false, type: TokenType.TEXT,                         text: "\n"},
	]
);

for (const token of htmltok(source))
{	//console.log(token.debug());
	if (token.type == TokenType.ATTR_VALUE)
	{	console.log(`Attribute value: ${token.getValue()}`);
	}
}
```

Prints:

```ts
Attribute value: viewport
Attribute value: width=device-width, initial-scale=1.0
Attribute value: "Title"
```

## htmltok() - Tokenize string

> `function` [htmltok](generated-doc/function.htmltok/README.md)(source: `string`, settings: [Settings](generated-doc/interface.Settings/README.md)=\{}, hierarchy: `string`\[]=\[], tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1): Generator\<[Token](generated-doc/class.Token/README.md), `void`, `string`>

This function returns iterator over tokens found in given HTML source string.

`htmltok()` arguments:

- `source` - HTML or XML string.
- `settings` - Affects how the code will be parsed.
- `hierarchy` - If you pass an array object, this object will be modified during tokenization process - after yielding each next token. In this array you can observe current elements nesting hierarchy. For normal operation you need to pass empty array, but if you resume parsing from some point, you can provide initial hierarchy. All tag names here are lowercased.
- `tabWidth` - Width of TAB stops. Affects `nColumn` of returned tokens.
- `nLine` - Will start counting lines from this line number.
- `nColumn` - Will start counting lines (and columns) from this column number.

This function returns [Token](generated-doc/class.Token/README.md) iterator.

Before giving the last token in the source, this function generates [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--21).
You can ignore it, or you can react by calling the following `it.next(more)` function of the iterator with a string argument, that contains code continuation.
In this case this code will be appended to the last token, and the tokenization process will continue.

```ts
// To download and run this example:
// curl 'https://raw.githubusercontent.com/jeremiah-shaulov/htmltok/v2.0.2/README.md' | perl -ne 's/^> //; $y=$1 if /^```(.)?/; print $_ if $y&&$m; $m=$y&&$m+/<example-65ya>/' > /tmp/example-65ya.ts
// deno run /tmp/example-65ya.ts

import {htmltok, TokenType} from 'https://deno.land/x/htmltok@v2.0.2/mod.ts';

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

> `class` Token<br>
> {<br>
> &nbsp; &nbsp; 🔧 [constructor](generated-doc/class.Token/README.md#-constructortext-string-type-tokentype-nline-number1-ncolumn-number1-level-number0-tagname-string-isselfclosing-booleanfalse-isforeign-booleanfalse)(text: `string`, type: [TokenType](generated-doc/enum.TokenType/README.md), nLine: `number`=1, nColumn: `number`=1, level: `number`=0, tagName: `string`="", isSelfClosing: `boolean`=false, isForeign: `boolean`=false)<br>
> &nbsp; &nbsp; 📄 [text](generated-doc/class.Token/README.md#-text-string): `string`<br>
> &nbsp; &nbsp; 📄 [type](generated-doc/class.Token/README.md#-type-tokentype): [TokenType](generated-doc/enum.TokenType/README.md)<br>
> &nbsp; &nbsp; 📄 [nLine](generated-doc/class.Token/README.md#-nline-number): `number`<br>
> &nbsp; &nbsp; 📄 [nColumn](generated-doc/class.Token/README.md#-ncolumn-number): `number`<br>
> &nbsp; &nbsp; 📄 [level](generated-doc/class.Token/README.md#-level-number): `number`<br>
> &nbsp; &nbsp; 📄 [tagName](generated-doc/class.Token/README.md#-tagname-string): `string`<br>
> &nbsp; &nbsp; 📄 [isSelfClosing](generated-doc/class.Token/README.md#-isselfclosing-boolean): `boolean`<br>
> &nbsp; &nbsp; 📄 [isForeign](generated-doc/class.Token/README.md#-isforeign-boolean): `boolean`<br>
> &nbsp; &nbsp; ⚙ [toString](generated-doc/class.Token/README.md#-tostring-string)(): `string`<br>
> &nbsp; &nbsp; ⚙ [normalized](generated-doc/class.Token/README.md#-normalized-string)(): `string`<br>
> &nbsp; &nbsp; ⚙ [debug](generated-doc/class.Token/README.md#-debug-string)(): `string`<br>
> &nbsp; &nbsp; ⚙ [getValue](generated-doc/class.Token/README.md#-getvalue-string)(): `string`<br>
> }

- `text` - original HTML or XML token text.
- `type` - Token type.
- `nLine` - Line number where this token starts.
- `nColumn` - Column number on the line where this token starts.
- `level` - Tag nesting level.
- `tagName` - is set on [TokenType.TAG\_OPEN\_BEGIN](generated-doc/enum.TokenType/README.md#tag_open_begin--6), [TokenType.TAG\_CLOSE](generated-doc/enum.TokenType/README.md#tag_close--12), [TokenType.ATTR\_NAME](generated-doc/enum.TokenType/README.md#attr_name--8), [TokenType.ATTR\_VALUE](generated-doc/enum.TokenType/README.md#attr_value--10), [TokenType.FIX\_STRUCTURE\_TAG\_OPEN](generated-doc/enum.TokenType/README.md#fix_structure_tag_open--17) and [TokenType.FIX\_STRUCTURE\_TAG\_CLOSE](generated-doc/enum.TokenType/README.md#fix_structure_tag_close--19). Lowercased tag name.
- `isSelfClosing` - is set only on [TokenType.TAG\_OPEN\_END](generated-doc/enum.TokenType/README.md#tag_open_end--11). `true` if this tag is one of `area`, `base`, `br`, `col`, `command`, `embed`, `hr`, `img`, `input`, `keygen`, `link`, `menuitem`, `meta`, `param`, `source`, `track`, `wbr`. [Token.text](generated-doc/class.Token/README.md#-text-string) can be `>` or `/>`, as appears in the source. Also it's set to `true` in foreign (XML) tags that use `/>` to self-close the tag. If `/>` is used in a regular HTML tag, not from the list above, the `/` character is treated as [TokenType.JUNK](generated-doc/enum.TokenType/README.md#junk--15).
- `isForeign` - When parsing in HTML mode ([Settings.mode](generated-doc/interface.Settings/README.md#-mode-html--xml) !== 'xml'), this flag is set on each token inside `<svg>` and `<math>` tags. In XML mode it's always set.

[Token.toString()](generated-doc/class.Token/README.md#-tostring-string) method returns original token ([Token.text](generated-doc/class.Token/README.md#-text-string)), except for [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--21) and `FIX_STRUCTURE_*` token types, for which it returns empty string.

[Token.normalized()](generated-doc/class.Token/README.md#-normalized-string) - returns token text, as it's suggested according to HTML normalization rules.
- For [TokenType.JUNK](generated-doc/enum.TokenType/README.md#junk--15) and [TokenType.JUNK\_DUP\_ATTR\_NAME](generated-doc/enum.TokenType/README.md#junk_dup_attr_name--16) it returns empty string (unlike in [Token.toString()](generated-doc/class.Token/README.md#-tostring-string)).
- For [TokenType.RAW\_LT](generated-doc/enum.TokenType/README.md#raw_lt--13) it returns `&lt;` ([Token.toString()](generated-doc/class.Token/README.md#-tostring-string) would return `<`).
- For [TokenType.RAW\_AMP](generated-doc/enum.TokenType/README.md#raw_amp--14) it returns `&amp;` ([Token.toString()](generated-doc/class.Token/README.md#-tostring-string) would return `&`).
- For [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--21) returns empty string.
- For other token types it returns [Token.text](generated-doc/class.Token/README.md#-text-string).

[Token.debug()](generated-doc/class.Token/README.md#-debug-string) - returns [Token](generated-doc/class.Token/README.md) object stringified for `console.log()`.

[Token.getValue()](generated-doc/class.Token/README.md#-getvalue-string) - returns decoded value of the token.
- For [TokenType.CDATA](generated-doc/enum.TokenType/README.md#cdata--1) it returns the containing text (without `<![CDATA[` and `]]>`).
- For [TokenType.COMMENT](generated-doc/enum.TokenType/README.md#comment--3) it returns the containing text (without `<!--` and `-->`).
- For [TokenType.PI](generated-doc/enum.TokenType/README.md#pi--5) it returns the containing text (without `<?` and `?>`).
- For [TokenType.TAG\_OPEN\_BEGIN](generated-doc/enum.TokenType/README.md#tag_open_begin--6), [TokenType.TAG\_CLOSE](generated-doc/enum.TokenType/README.md#tag_close--12), [TokenType.FIX\_STRUCTURE\_TAG\_OPEN](generated-doc/enum.TokenType/README.md#fix_structure_tag_open--17) and [TokenType.FIX\_STRUCTURE\_TAG\_CLOSE](generated-doc/enum.TokenType/README.md#fix_structure_tag_close--19) it returns lowercased (if not XML and there're no preprocessing instructions) tag name (the same as [Token.tagName](generated-doc/class.Token/README.md#-tagname-string)).
- For [TokenType.ENTITY](generated-doc/enum.TokenType/README.md#entity--2) it returns the decoded value of the entity. In both HTML and XML, it understands only standard HTML5 entity names.
- For [TokenType.ATTR\_NAME](generated-doc/enum.TokenType/README.md#attr_name--8) it returns lowercased (if not XML and there're no preprocessing instructions) attribute name.
- For [TokenType.ATTR\_VALUE](generated-doc/enum.TokenType/README.md#attr_value--10) it returns the entity-decoded value of the attribute, without markup quotes (if used).
- For [TokenType.RAW\_LT](generated-doc/enum.TokenType/README.md#raw_lt--13) it returns `<`.
- For [TokenType.RAW\_AMP](generated-doc/enum.TokenType/README.md#raw_amp--14) it returns `&`.
- For [TokenType.JUNK](generated-doc/enum.TokenType/README.md#junk--15), [TokenType.JUNK\_DUP\_ATTR\_NAME](generated-doc/enum.TokenType/README.md#junk_dup_attr_name--16) and [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--21) it returns empty string.
- For other token types it returns [Token.text](generated-doc/class.Token/README.md#-text-string).

## TokenType

> `const` `enum` TokenType<br>
> {<br>
> &nbsp; &nbsp; [TEXT](generated-doc/enum.TokenType/README.md#text--0) = <mark>0</mark><br>
> &nbsp; &nbsp; [CDATA](generated-doc/enum.TokenType/README.md#cdata--1) = <mark>1</mark><br>
> &nbsp; &nbsp; [ENTITY](generated-doc/enum.TokenType/README.md#entity--2) = <mark>2</mark><br>
> &nbsp; &nbsp; [COMMENT](generated-doc/enum.TokenType/README.md#comment--3) = <mark>3</mark><br>
> &nbsp; &nbsp; [DTD](generated-doc/enum.TokenType/README.md#dtd--4) = <mark>4</mark><br>
> &nbsp; &nbsp; [PI](generated-doc/enum.TokenType/README.md#pi--5) = <mark>5</mark><br>
> &nbsp; &nbsp; [TAG\_OPEN\_BEGIN](generated-doc/enum.TokenType/README.md#tag_open_begin--6) = <mark>6</mark><br>
> &nbsp; &nbsp; [TAG\_OPEN\_SPACE](generated-doc/enum.TokenType/README.md#tag_open_space--7) = <mark>7</mark><br>
> &nbsp; &nbsp; [ATTR\_NAME](generated-doc/enum.TokenType/README.md#attr_name--8) = <mark>8</mark><br>
> &nbsp; &nbsp; [ATTR\_EQ](generated-doc/enum.TokenType/README.md#attr_eq--9) = <mark>9</mark><br>
> &nbsp; &nbsp; [ATTR\_VALUE](generated-doc/enum.TokenType/README.md#attr_value--10) = <mark>10</mark><br>
> &nbsp; &nbsp; [TAG\_OPEN\_END](generated-doc/enum.TokenType/README.md#tag_open_end--11) = <mark>11</mark><br>
> &nbsp; &nbsp; [TAG\_CLOSE](generated-doc/enum.TokenType/README.md#tag_close--12) = <mark>12</mark><br>
> &nbsp; &nbsp; [RAW\_LT](generated-doc/enum.TokenType/README.md#raw_lt--13) = <mark>13</mark><br>
> &nbsp; &nbsp; [RAW\_AMP](generated-doc/enum.TokenType/README.md#raw_amp--14) = <mark>14</mark><br>
> &nbsp; &nbsp; [JUNK](generated-doc/enum.TokenType/README.md#junk--15) = <mark>15</mark><br>
> &nbsp; &nbsp; [JUNK\_DUP\_ATTR\_NAME](generated-doc/enum.TokenType/README.md#junk_dup_attr_name--16) = <mark>16</mark><br>
> &nbsp; &nbsp; [FIX\_STRUCTURE\_TAG\_OPEN](generated-doc/enum.TokenType/README.md#fix_structure_tag_open--17) = <mark>17</mark><br>
> &nbsp; &nbsp; [FIX\_STRUCTURE\_TAG\_OPEN\_SPACE](generated-doc/enum.TokenType/README.md#fix_structure_tag_open_space--18) = <mark>18</mark><br>
> &nbsp; &nbsp; [FIX\_STRUCTURE\_TAG\_CLOSE](generated-doc/enum.TokenType/README.md#fix_structure_tag_close--19) = <mark>19</mark><br>
> &nbsp; &nbsp; [FIX\_STRUCTURE\_ATTR\_QUOT](generated-doc/enum.TokenType/README.md#fix_structure_attr_quot--20) = <mark>20</mark><br>
> &nbsp; &nbsp; [MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--21) = <mark>21</mark><br>
> }

- [TokenType.TEXT](generated-doc/enum.TokenType/README.md#text--0) - Text (character data). It doesn't contain entities and preprocessing instructions, as they are returned as separate tokens.
- [TokenType.CDATA](generated-doc/enum.TokenType/README.md#cdata--1) - The CDATA block, like `<![CDATA[...]]>`. It can occure in XML mode (`Settings.mode === 'xml'`), and in `svg` and `math` elements in HTML mode. In other places `<![CDATA[...]]>` is returned as [TokenType.JUNK](generated-doc/enum.TokenType/README.md#junk--15). This token **can** contain preprocessing instructions in it's [Token.text](generated-doc/class.Token/README.md#-text-string).
- [TokenType.ENTITY](generated-doc/enum.TokenType/README.md#entity--2) - One character reference, like `&apos;`, `&#39;` or `&#x27;`. This token also **can** contain preprocessing instructions in it's [Token.text](generated-doc/class.Token/README.md#-text-string), like `&a<?...?>o<?...?>;`.
- [TokenType.COMMENT](generated-doc/enum.TokenType/README.md#comment--3) - HTML comment, like `<!--...-->`. It **can** contain preprocessing instructions.
- [TokenType.DTD](generated-doc/enum.TokenType/README.md#dtd--4) - Document type declaration, like `<!...>`. It **can** contain preprocessing instructions.
- [TokenType.PI](generated-doc/enum.TokenType/README.md#pi--5) - Preprocessing instruction, like `<?...?>`.
- [TokenType.TAG\_OPEN\_BEGIN](generated-doc/enum.TokenType/README.md#tag_open_begin--6) - `<` char followed by tag name, like `<script`. Tag name **can** contain preprocessing instructions, like `<sc<?...?>ip<?...?>`. [Token.tagName](generated-doc/class.Token/README.md#-tagname-string) contains lowercased (if not XML and there're no preprocessing instructions) tag name.
- [TokenType.TAG\_OPEN\_SPACE](generated-doc/enum.TokenType/README.md#tag_open_space--7) - Any number of whitespace characters (can include newline chars) inside opening tag markup. It separates tag name and attributes, and can occure between attributes, and at the end of opening tag.
- [TokenType.ATTR\_NAME](generated-doc/enum.TokenType/README.md#attr_name--8) - Attribute name. It **can** contain preprocessing instructions, like `a<?...?>b<?...?>`. `Token.getValue()` returns lowercased (if not XML and there're no preprocessing instructions) attribute name.
- [TokenType.ATTR\_EQ](generated-doc/enum.TokenType/README.md#attr_eq--9) - `=` char after attribute name. It's always followed by [TokenType.ATTR\_VALUE](generated-doc/enum.TokenType/README.md#attr_value--10) (optionally preceded by [TokenType.TAG\_OPEN\_SPACE](generated-doc/enum.TokenType/README.md#tag_open_space--7)). If `=` is not followed by attribute value, it's returned as [TokenType.JUNK](generated-doc/enum.TokenType/README.md#junk--15).
- [TokenType.ATTR\_VALUE](generated-doc/enum.TokenType/README.md#attr_value--10) - Attribute value. It can be quoted in `"` or `'`, or it can be unquoted. This token type **can** contain entities and preprocessing instructions, like `"a<?...?>&lt;<?...?>"`. [Token.getValue()](generated-doc/class.Token/README.md#-getvalue-string) returns unquoted text with decoded entities, but preprocessing instructions are left intact.
- [TokenType.TAG\_OPEN\_END](generated-doc/enum.TokenType/README.md#tag_open_end--11) - `>` or `/>` chars that terminate opening tag. [Token.isSelfClosing](generated-doc/class.Token/README.md#-isselfclosing-boolean) indicates whether this tag doesn't have corresponding closing tag.
- [TokenType.TAG\_CLOSE](generated-doc/enum.TokenType/README.md#tag_close--12) - Closing tag token, like `</script >`. It **can** contain preprocessing instructions, like `</sc<?...?>ip<?...?>>`.
- [TokenType.RAW\_LT](generated-doc/enum.TokenType/README.md#raw_lt--13) - `<` char, that is not part of markup (just appears in text). Typically you want to convert it to `&lt;`.
- [TokenType.RAW\_AMP](generated-doc/enum.TokenType/README.md#raw_amp--14) - `&` char, that is not part of markup (just appears in text). Typically you want to convert it to `&amp;`.
- [TokenType.JUNK](generated-doc/enum.TokenType/README.md#junk--15) - Characters that are not in place. Typically you want to remove them. This token type can appear in the following situations:
	- Characters in opening tag, that can't be interpreted as attributes. For example repeating `=` char, or `/` at the end of opening tag, which must have corresponding closing tag.
	- Unnecessary quotes around attribute value, if requested to unquote attributes.
	- Attribute values of duplicate attributes.
	- Closing tag, that was not opened.
	- CDATA not in XML or foreign tags.
- [TokenType.JUNK\_DUP\_ATTR\_NAME](generated-doc/enum.TokenType/README.md#junk_dup_attr_name--16) - Name of duplicate attribute.
- [TokenType.FIX\_STRUCTURE\_TAG\_OPEN](generated-doc/enum.TokenType/README.md#fix_structure_tag_open--17) - `FIX_STRUCTURE_*` token types don't represent text in source code, but are generated by the tokenizer to suggest markup fixes. `FIX_STRUCTURE_TAG_OPEN` is automatically inserted opening tag, like `<b>`. Token text cannot contain preprocessing instructions. Consider the following markup: `<b>BOLD<u>BOLD-UND</b>UND</u>` many browsers will interpret this as `<b>BOLD<u>BOLD-UND</u></b><u>UND</u>`. Also this tokenizer will suggest `</u>` as [TokenType.FIX\_STRUCTURE\_TAG\_CLOSE](generated-doc/enum.TokenType/README.md#fix_structure_tag_close--19), and `<u>` as [TokenType.FIX\_STRUCTURE\_TAG\_OPEN](generated-doc/enum.TokenType/README.md#fix_structure_tag_open--17).
- [TokenType.FIX\_STRUCTURE\_TAG\_OPEN\_SPACE](generated-doc/enum.TokenType/README.md#fix_structure_tag_open_space--18) - One space character that is suggested between attributes in situations like `<meta name="name"content="content">`.
- [TokenType.FIX\_STRUCTURE\_TAG\_CLOSE](generated-doc/enum.TokenType/README.md#fix_structure_tag_close--19) - Autogenerated closing tag, like `</td>`. It's generated when closing tag is missing in the source markup.
- [TokenType.FIX\_STRUCTURE\_ATTR\_QUOT](generated-doc/enum.TokenType/README.md#fix_structure_attr_quot--20) - One autogenerated quote character to surround attribute value, if `Settings.quoteAttributes` was requested, or when `Settings.mode === 'xml'`.
- [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--21) - Before returning the last token found in the source string, [htmltok()](generated-doc/function.htmltok/README.md) generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.

## Settings

> `interface` Settings<br>
> {<br>
> &nbsp; &nbsp; 📄 [mode](generated-doc/interface.Settings/README.md#-mode-html--xml)?: <mark>"html"</mark> | <mark>"xml"</mark><br>
> &nbsp; &nbsp; 📄 [noCheckAttributes](generated-doc/interface.Settings/README.md#-nocheckattributes-boolean)?: `boolean`<br>
> &nbsp; &nbsp; 📄 [quoteAttributes](generated-doc/interface.Settings/README.md#-quoteattributes-boolean)?: `boolean`<br>
> &nbsp; &nbsp; 📄 [unquoteAttributes](generated-doc/interface.Settings/README.md#-unquoteattributes-boolean)?: `boolean`<br>
> }

- `mode` - Tokenize in either HTML, or XML mode. In XML mode, tag and attribute names are case-sensitive, and there's no special treatment for tags like `<script>`, `<style>`, `<textarea>` and `<title>`. Also there're no self-closing by definition tags, and `/>` can be used in any tag to make it self-closing. Also XML mode implies [Settings.quoteAttributes](generated-doc/interface.Settings/README.md#-quoteattributes-boolean).
- `noCheckAttributes` - If `true`, will not try to determine duplicate attribute names. This can save some computing resources.
- `quoteAttributes` - If `true`, will generate [TokenType.FIX\_STRUCTURE\_ATTR\_QUOT](generated-doc/enum.TokenType/README.md#fix_structure_attr_quot--20) tokens to suggest quotes around unquoted attribute values.
- `unquoteAttributes` - If `true`, will return quotes around attribute values as [TokenType.JUNK](generated-doc/enum.TokenType/README.md#junk--15), if such quotes are not necessary. HTML5 standard allows unquoted attributes (unlike XML), and removing quotes can make markup lighter, and more readable by humans and robots.

## HTML normalization

[htmltok()](generated-doc/function.htmltok/README.md) can be used to normalize HTML, that is, to fix markup errors. This includes closing unclosed tags, quoting attributes (in XML or if [Settings.quoteAttributes](generated-doc/interface.Settings/README.md#-quoteattributes-boolean) is set), etc.

```ts
import {htmltok} from 'https://deno.land/x/htmltok@v2.0.2/mod.ts';

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

> `function` [htmltokStream](generated-doc/function.htmltokStream/README.md)(source: ReadableStream\<Uint8Array>, settings: [Settings](generated-doc/interface.Settings/README.md)=\{}, hierarchy: `string`\[]=\[], tabWidth: `number`=4, nLine: `number`=1, nColumn: `number`=1, decoder: TextDecoder=defaultDecoder): AsyncGenerator\<[Token](generated-doc/class.Token/README.md), `void`, `any`>

This function allows to tokenize a `ReadableStream<Uint8Array>` stream of HTML or XML source code.
It never generates [TokenType.MORE\_REQUEST](generated-doc/enum.TokenType/README.md#more_request--21).

If `decoder` is provided, will use it to convert bytes to text.

```ts
import {htmltokReader} from 'https://deno.land/x/htmltok@v2.0.2/mod.ts';
import {readerFromStreamReader} from 'https://deno.land/std@0.167.0/streams/reader_from_stream_reader.ts';

const res = await fetch("https://example.com/");
const reader = readerFromStreamReader(res.body!.getReader());
for await (const token of htmltokReader(reader))
{	console.log(token.debug());
}
```

## htmlDecode() - Decode HTML5 entities

> `function` [htmlDecode](generated-doc/function.htmlDecode/README.md)(str: `string`, skipPi: `boolean`=false): `string`

This function decodes entities (character references), like `&apos;`, `&#39;` or `&#x27;`.
If `skipPi` is `true`, it will operate only on parts between preprocessing instructions.

```ts
import {htmlDecode} from 'https://deno.land/x/htmltok@v2.0.2/mod.ts';

console.log(htmlDecode(`Text&amp;text<?&amp;?>text`)); // prints: Text&text<?&?>text
console.log(htmlDecode(`Text&amp;text<?&amp;?>text`, true)); // prints: Text&text<?&amp;?>text
```
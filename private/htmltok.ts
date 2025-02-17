import {htmlDecode} from './entities.ts';

const TAGS_VOID = new Set(['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr']);
const TAGS_NON_STRUCTURE = new Set(['b', 'strong', 'i', 'u', 's', 'strike', 'small', 'big', 'nobr']);

const STR_PP = String.raw `<\?  .*?  (?:$ | \?>)`;
const STR_ATTRS = String.raw `(?:    "(?:<\?.*?\?> | [^"])*"  |  '(?:<\?.*?\?> | [^'])*'  |  <\?.*?\?>  |  [^>]    )*`;
const STR_DTD = String.raw `(?:    "(?:<\?.*?\?> | [^"])*"  |  '(?:<\?.*?\?> | [^'])*'  |  <\?.*?\?>  |  -- (?:(?:<\?.*?\?> | [^-])* -(?!-))* (?:<\?.*?\?> | [^-])* --  |  \[ (?:<\?.*?\?> | [^\]])* \]  |  [^>]    )*`;
const STR_ENTITY = String.raw `&  #?  (?:[a-z0-9] | <\?.*?\?>){1,32}  (?:$ | ;)`;

const RE_TOKENIZER = new RegExp
(	String.raw
	`	${STR_PP}  |
		<!-  (?:$ | -)  (?:(?:<\?.*?\?> | [^-])* -(?!->))* (?:<\?.*?\?> | [^-])*  (?:$ | -->)  |
		<!\[  (?:$|C)  (?:$|D)  (?:$|A)  (?:$|T)  (?:$|A)  (?:$|\[)  (?:(?:<\?.*?\?> | [^\]])* \](?!\]>))* (?:<\?.*?\?> | [^\]])*  (?:$ | \]\]>)  |
		<!  ${STR_DTD}  (?:$ | >)  |
		</ (?:  $  |  (     (?:[\w\-:] | <\?.*?\?>)+     )  )  \s*  (?:$ | >)  |
		(<    (?:[\w\-:] | <\?.*?\?>)+    )  (${STR_ATTRS})  (?:$ | >) |
		${STR_ENTITY}  |
		[^<&]+  |
		<  |
		&
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_TITLE = new RegExp
(	String.raw
	`	${STR_PP}  |
		</(title) \s*>  |
		</ (?:[\w\-:] | <\?.*?\?>)*  \s*  $  |
		${STR_ENTITY}  |
		[^<&]+  |
		<  |
		&
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_TEXTAREA = new RegExp
(	String.raw
	`	${STR_PP}  |
		</(textarea) \s*>  |
		</ (?:[\w\-:] | <\?.*?\?>)*  \s*  $  |
		${STR_ENTITY}  |
		[^<&]+  |
		<  |
		&
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_SCRIPT = new RegExp
(	String.raw
	`	${STR_PP}  |
		</(script) \s*>  |
		</ (?:[\w\-:] | <\?.*?\?>)*  \s*  $  |
		[^<]+  |
		<
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_TOKENIZER_STYLE = new RegExp
(	String.raw
	`	${STR_PP}  |
		</(style) \s*>  |
		</ (?:[\w\-:] | <\?.*?\?>)*  \s*  $  |
		[^<]+  |
		<
	`.replace(/\s+/g, ''),
	'yis'
);

const RE_SPACE = /\s*/y;
const RE_ATTR_NAME = /(?:<\?.*?\?>|[^=\s"'/])+/g;
const RE_ATTR_VALUE = /(?:<\?.*?\?>|[^\s"'/])+/y;
const RE_ATTR_VALUE_QUOT = /"(?:<\?.*?\?>|[^"])*"/y;
const RE_ATTR_VALUE_APOS = /'(?:<\?.*?\?>|[^'])*'/y;
const RE_PP = /<\?.*?\?>/g;

const C_AMP = '&'.charCodeAt(0);
const C_LT = '<'.charCodeAt(0);
const C_GT = '>'.charCodeAt(0);
const C_QEST = '?'.charCodeAt(0);
const C_EXCL = '!'.charCodeAt(0);
const C_SLASH = '/'.charCodeAt(0);
const C_MINUS = '-'.charCodeAt(0);
const C_EQ = '='.charCodeAt(0);
const C_DASH = '-'.charCodeAt(0);
const C_QUOT = '"'.charCodeAt(0);
const C_APOS = "'".charCodeAt(0);
const C_BACKTICK = "`".charCodeAt(0);
const C_CR = '\r'.charCodeAt(0);
const C_LF = '\n'.charCodeAt(0);
const C_TAB = '\t'.charCodeAt(0);
const C_FORM_FEED = '\f'.charCodeAt(0);
const C_SPACE = ' '.charCodeAt(0);
const C_SEMICOLON = ';'.charCodeAt(0);
const C_SQUARE_OPEN = '['.charCodeAt(0);
const C_SQUARE_CLOSE = ']'.charCodeAt(0);

const PADDER = '                                ';

export interface Settings
{	/**	Tokenize in either HTML, or XML mode. In XML mode, tag and attribute names are case-sensitive, and there's no special treatment for tags like `<script>`, `<style>`, `<textarea>` and `<title>`. Also there're no self-closing by definition tags, and `/>` can be used in any tag to make it self-closing. Also XML mode implies {@link Settings.quoteAttributes}.
	 **/
	mode?: 'html' | 'xml';

	/**	If `true`, will not try to determine duplicate attribute names. This can save some computing resources.
	 **/
	noCheckAttributes?: boolean;

	/**	If `true`, will generate {@link TokenType.FIX_STRUCTURE_ATTR_QUOT} tokens to suggest quotes around unquoted attribute values.
	 **/
	quoteAttributes?: boolean;

	/**	If `true`, will return quotes around attribute values as {@link TokenType.JUNK}, if such quotes are not necessary. HTML5 standard allows unquoted attributes (unlike XML), and removing quotes can make markup lighter, and more readable by humans and robots.
	 **/
	unquoteAttributes?: boolean;
}

const enum QuoteAttributesMode
{	INTACT,
	QUOTE,
	UNQUOTE,
}

export const enum TokenType
{	/**	Text (character data). It doesn't contain entities and preprocessing instructions, as they are returned as separate tokens.
	 **/
	TEXT,

	/**	The CDATA block, like `<![CDATA[...]]>`. It can occure in XML mode (`Settings.mode === 'xml'`), and in `svg` and `math` elements in HTML mode. In other places `<![CDATA[...]]>` is returned as {@link TokenType.JUNK}. This token **can** contain preprocessing instructions in it's {@link Token.text}.
	 **/
	CDATA,

	/**	One character reference, like `&apos;`, `&#39;` or `&#x27;`. This token also **can** contain preprocessing instructions in it's {@link Token.text}, like `&a<?...?>o<?...?>;`.
	 **/
	ENTITY,

	/**	HTML comment, like `<!--...-->`. It **can** contain preprocessing instructions.
	 **/
	COMMENT,

	/**	Document type declaration, like `<!...>`. It **can** contain preprocessing instructions.
	 **/
	DTD,

	/**	Preprocessing instruction, like `<?...?>`.
	 **/
	PI,

	/**	`<` char followed by tag name, like `<script`. Tag name **can** contain preprocessing instructions, like `<sc<?...?>ip<?...?>`. {@link Token.tagName} contains lowercased (if not XML and there're no preprocessing instructions) tag name.
	 **/
	TAG_OPEN_BEGIN,

	/**	Any number of whitespace characters (can include newline chars) inside opening tag markup. It separates tag name and attributes, and can occure between attributes, and at the end of opening tag.
	 **/
	TAG_OPEN_SPACE,

	/**	Attribute name. It **can** contain preprocessing instructions, like `a<?...?>b<?...?>`. `Token.getValue()` returns lowercased (if not XML and there're no preprocessing instructions) attribute name.
	 **/
	ATTR_NAME,

	/**	`=` char after attribute name. It's always followed by {@link TokenType.ATTR_VALUE} (optionally preceded by {@link TokenType.TAG_OPEN_SPACE}). If `=` is not followed by attribute value, it's returned as {@link TokenType.JUNK}.
	 **/
	ATTR_EQ,

	/**	Attribute value. It can be quoted in `"` or `'`, or it can be unquoted. This token type **can** contain entities and preprocessing instructions, like `"a<?...?>&lt;<?...?>"`. {@link Token.getValue()} returns unquoted text with decoded entities, but preprocessing instructions are left intact.
	 **/
	ATTR_VALUE,

	/**	`>` or `/>` chars that terminate opening tag. {@link Token.isSelfClosing} indicates whether this tag doesn't have corresponding closing tag.
	 **/
	TAG_OPEN_END,

	/**	Closing tag token, like `</script >`. It **can** contain preprocessing instructions, like `</sc<?...?>ip<?...?>>`.
	 **/
	TAG_CLOSE,

	/**	`<` char, that is not part of markup (just appears in text). Typically you want to convert it to `&lt;`.
	 **/
	RAW_LT,

	/**	`&` char, that is not part of markup (just appears in text). Typically you want to convert it to `&amp;`.
	 **/
	RAW_AMP,

	/**	Characters that are not in place. Typically you want to remove them. This token type can appear in the following situations:

		- Characters in opening tag, that can't be interpreted as attributes. For example repeating `=` char, or `/` at the end of opening tag, which must have corresponding closing tag.
		- Unnecessary quotes around attribute value, if requested to unquote attributes.
		- Attribute values of duplicate attributes.
		- Closing tag, that was not opened.
		- CDATA not in XML or foreign tags.
	 **/
	JUNK,

	/**	Name of duplicate attribute.
	 **/
	JUNK_DUP_ATTR_NAME,

	/**	`FIX_STRUCTURE_*` token types don't represent text in source code, but are generated by the tokenizer to suggest markup fixes. `FIX_STRUCTURE_TAG_OPEN` is automatically inserted opening tag, like `<b>`. Token text cannot contain preprocessing instructions. Consider the following markup: `<b>BOLD<u>BOLD-UND</b>UND</u>` many browsers will interpret this as `<b>BOLD<u>BOLD-UND</u></b><u>UND</u>`. Also this tokenizer will suggest `</u>` as {@link TokenType.FIX_STRUCTURE_TAG_CLOSE}, and `<u>` as {@link TokenType.FIX_STRUCTURE_TAG_OPEN}.
	 **/
	FIX_STRUCTURE_TAG_OPEN,

	/**	One space character that is suggested between attributes in situations like `<meta name="name"content="content">`.
	 **/
	FIX_STRUCTURE_TAG_OPEN_SPACE,

	/**	Autogenerated closing tag, like `</td>`. It's generated when closing tag is missing in the source markup.
	 **/
	FIX_STRUCTURE_TAG_CLOSE,

	/**	One autogenerated quote character to surround attribute value, if `Settings.quoteAttributes` was requested, or when `Settings.mode === 'xml'`.
	 **/
	FIX_STRUCTURE_ATTR_QUOT,

	/**	Before returning the last token found in the source string, {@link htmltok()} generate this meta-token. If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.
	 **/
	MORE_REQUEST,
}

export class Token
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

	toString()
	{	return this.type>=TokenType.FIX_STRUCTURE_TAG_OPEN && this.type<=TokenType.FIX_STRUCTURE_ATTR_QUOT || this.type==TokenType.MORE_REQUEST ? '' : this.text;
	}

	normalized()
	{	return this.type==TokenType.JUNK || this.type==TokenType.JUNK_DUP_ATTR_NAME || this.type==TokenType.MORE_REQUEST ? '' : this.type==TokenType.RAW_LT ? '&lt;' : this.type==TokenType.RAW_AMP ? '&amp;' : this.text;
	}

	debug()
	{	let type = '';
		switch (this.type)
		{	case TokenType.TEXT:                         type = 'TokenType.TEXT,                        '; break;
			case TokenType.CDATA:                        type = 'TokenType.CDATA,                       '; break;
			case TokenType.ENTITY:                       type = 'TokenType.ENTITY,                      '; break;
			case TokenType.COMMENT:                      type = 'TokenType.COMMENT,                     '; break;
			case TokenType.DTD:                          type = 'TokenType.DTD,                         '; break;
			case TokenType.PI:                           type = 'TokenType.PI,                          '; break;
			case TokenType.TAG_OPEN_BEGIN:               type = 'TokenType.TAG_OPEN_BEGIN,              '; break;
			case TokenType.TAG_OPEN_SPACE:               type = 'TokenType.TAG_OPEN_SPACE,              '; break;
			case TokenType.ATTR_NAME:                    type = 'TokenType.ATTR_NAME,                   '; break;
			case TokenType.ATTR_EQ:                      type = 'TokenType.ATTR_EQ,                     '; break;
			case TokenType.ATTR_VALUE:                   type = 'TokenType.ATTR_VALUE,                  '; break;
			case TokenType.TAG_OPEN_END:                 type = 'TokenType.TAG_OPEN_END,                '; break;
			case TokenType.TAG_CLOSE:                    type = 'TokenType.TAG_CLOSE,                   '; break;
			case TokenType.RAW_LT:                       type = 'TokenType.RAW_LT,                      '; break;
			case TokenType.RAW_AMP:                      type = 'TokenType.RAW_AMP,                     '; break;
			case TokenType.JUNK:                         type = 'TokenType.JUNK,                        '; break;
			case TokenType.JUNK_DUP_ATTR_NAME:           type = 'TokenType.JUNK_DUP_ATTR_NAME,          '; break;
			case TokenType.FIX_STRUCTURE_TAG_OPEN:       type = 'TokenType.FIX_STRUCTURE_TAG_OPEN,      '; break;
			case TokenType.FIX_STRUCTURE_TAG_OPEN_SPACE: type = 'TokenType.FIX_STRUCTURE_TAG_OPEN_SPACE,'; break;
			case TokenType.FIX_STRUCTURE_TAG_CLOSE:      type = 'TokenType.FIX_STRUCTURE_TAG_CLOSE,     '; break;
			case TokenType.FIX_STRUCTURE_ATTR_QUOT:      type = 'TokenType.FIX_STRUCTURE_ATTR_QUOT,     '; break;
			case TokenType.MORE_REQUEST:                 type = 'TokenType.MORE_REQUEST,                '; break;
		}
		return `{nLine: ${pad(this.nLine+',', 3)} nColumn: ${pad(this.nColumn+',', 3)} level: ${this.level}, tagName: ${pad(JSON.stringify(this.tagName)+',', 10)} isSelfClosing: ${this.isSelfClosing ? 'true, ' : 'false,'} isForeign: ${this.isForeign ? 'true, ' : 'false,'} type: ${type} text: ${JSON.stringify(this.text)}}`;
	}

	getValue()
	{	const {type, text} = this;
		switch (type)
		{	case TokenType.CDATA:
				return text.slice(9, -3);
			case TokenType.ENTITY:
				return htmlDecode(text);
			case TokenType.COMMENT:
				return text.slice(4, -3);
			case TokenType.PI:
				return text.slice(2, -2);
			case TokenType.TAG_OPEN_BEGIN:
			case TokenType.FIX_STRUCTURE_TAG_OPEN:
			case TokenType.TAG_CLOSE:
			case TokenType.FIX_STRUCTURE_TAG_CLOSE:
				return this.tagName;
			case TokenType.ATTR_NAME:
				return this.isForeign || text.indexOf('>')!=-1 ? text : text.toLowerCase(); // lowercase if not XML, and doesn't contain preprocessing instructions
			case TokenType.ATTR_VALUE:
				return htmlDecode(text.charCodeAt(0)==C_QUOT || text.charCodeAt(0)==C_APOS ? text.slice(1, -1) : text, true);
			case TokenType.RAW_LT:
				return '<';
			case TokenType.RAW_AMP:
				return '&';
			case TokenType.JUNK:
			case TokenType.JUNK_DUP_ATTR_NAME:
			case TokenType.MORE_REQUEST:
				return '';
			default:
				return text;
		}
	}
}

function pad(str: string, width: number)
{	return str + PADDER.substring(0, width-str.length);
}

export function *htmltok(source: string, settings: Settings={}, hierarchy: string[]=[], tabWidth=4, nLine=1, nColumn=1): Generator<Token, void, string|undefined>
{	function countLines(text: string, from: number, to: number)
	{	while (from < to)
		{	const c = text.charCodeAt(from++);
			if (c == C_CR)
			{	nLine++;
				nColumn = 1;
				if (text.charCodeAt(from) == C_LF)
				{	from++;
				}
			}
			else if (c == C_LF)
			{	nLine++;
				nColumn = 1;
			}
			else if (c == C_TAB)
			{	nColumn += tabWidth - (nColumn-1)%tabWidth;
			}
			else if (!(c>=0xDC00 && c<=0xDFFF)) // if not a second byte of a surrogate pair
			{	nColumn++;
			}
		}
	}

	const quoteAttributesMode = settings.mode==='xml' || settings.quoteAttributes ? QuoteAttributesMode.QUOTE : settings.unquoteAttributes ? QuoteAttributesMode.UNQUOTE : QuoteAttributesMode.INTACT;
	const curAttrs = settings.noCheckAttributes ? undefined : new Set<string>();
	let foreignLevel = settings.mode==='xml' ? -2 : -1; // -1 means not a foreign (xml) tag; otherwise `foreignLevel` must be set back to -1 when `hierarchy.length` reaches `foreignLevel`; -2 means will never reach
	let re = RE_TOKENIZER;
	let lastIndex = 0;
	let match;

	while (true)
	{	re.lastIndex = lastIndex;
		if (!(match = re.exec(source)))
		{	break;
		}
		lastIndex = re.lastIndex;
		const text = match[0];

		// Is last token?
		if (lastIndex == source.length)
		{	// MORE_REQUEST?
			const more = yield new Token(text, TokenType.MORE_REQUEST, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			if (typeof(more)=='string' && more.length)
			{	lastIndex = 0;
				source = text + more;
				continue;
			}

			// Last token can be incomplete
			if (text.length >= 2)
			{	if (text.charCodeAt(0) == C_AMP)
				{	const textNoPp = text.replace(RE_PP, '');
					if (textNoPp.charCodeAt(textNoPp.length-1) != C_SEMICOLON)
					{	yield new Token(text, TokenType.RAW_AMP, nLine, nColumn++, hierarchy.length, '', false, foreignLevel!=-1);
						lastIndex -= text.length - 1;
						continue;
					}
				}
				else if (text.charCodeAt(0) == C_LT)
				{	const textNoPp = text.replace(RE_PP, '');
					if
					(	textNoPp.charCodeAt(textNoPp.length-1) != C_GT ||
						text.charCodeAt(1)==C_EXCL &&
						(	text.charCodeAt(2)==C_MINUS && (textNoPp.length<7 || textNoPp.charCodeAt(textNoPp.length-3)!=C_MINUS || textNoPp.charCodeAt(textNoPp.length-2)!=C_MINUS) ||
							text.charCodeAt(2)==C_SQUARE_OPEN && (textNoPp.charCodeAt(textNoPp.length-3)!=C_SQUARE_CLOSE || textNoPp.charCodeAt(textNoPp.length-2)!=C_SQUARE_CLOSE)
						)
					)
					{	yield new Token(text, re==RE_TOKENIZER_SCRIPT || re==RE_TOKENIZER_STYLE ? TokenType.TEXT : TokenType.RAW_LT, nLine, nColumn++, hierarchy.length, '', false, foreignLevel!=-1);
						lastIndex -= text.length - 1;
						continue;
					}
				}
			}
		}

		if (text.charCodeAt(0) == C_AMP)
		{	// &name; or &
			if (text.length == 1)
			{	yield new Token(text, TokenType.RAW_AMP, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
				nColumn++;
			}
			else
			{	yield new Token(text, TokenType.ENTITY, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
				countLines(text, 0, text.length);
			}
		}
		else if (text.charCodeAt(0) != C_LT)
		{	// text
			yield new Token(text, TokenType.TEXT, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			countLines(text, 0, text.length);
		}
		else if (text.length < 2)
		{	// <
			yield new Token(text, re==RE_TOKENIZER_SCRIPT || re==RE_TOKENIZER_STYLE ? TokenType.TEXT : TokenType.RAW_LT, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			nColumn++;
		}
		else if (text.charCodeAt(1) == C_EXCL)
		{	// <!-- ... --> or <!NAME ... > or <![CDATA[ ... ]]>
			yield new Token(text, text.charCodeAt(2)==C_DASH ? TokenType.COMMENT : text.charCodeAt(2)!=C_SQUARE_OPEN ? TokenType.DTD : foreignLevel!=-1 ? TokenType.CDATA : TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			countLines(text, 0, text.length);
		}
		else if (text.charCodeAt(1) == C_QEST)
		{	// <? ... ?>
			yield new Token(text, TokenType.PI, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			countLines(text, 0, text.length);
		}
		else if (text.charCodeAt(1) == C_SLASH)
		{	// </name>
			let tagName = match[1];
			if (foreignLevel!=-2 && tagName.indexOf('<')==-1)
			{	tagName = tagName.toLowerCase();
			}
			let pos = hierarchy.lastIndexOf(tagName);
			if (pos == -1)
			{	yield new Token(text, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
			}
			else
			{	let posEnd = hierarchy.length;
				let structureBoundaryCrossed = false;
				// auto close tags
				while (posEnd > pos+1)
				{	const t = hierarchy[--posEnd];
					structureBoundaryCrossed = structureBoundaryCrossed || !TAGS_NON_STRUCTURE.has(t);
					yield new Token(`</${t}>`, TokenType.FIX_STRUCTURE_TAG_CLOSE, nLine, nColumn, posEnd, t, false, foreignLevel!=-1);
					if (posEnd <= foreignLevel)
					{	foreignLevel = -1;
					}
				}
				if (foreignLevel!=-1 || structureBoundaryCrossed || !TAGS_NON_STRUCTURE.has(tagName))
				{	// finally close the wanted tag
					hierarchy.length = pos;
					yield new Token(text, TokenType.TAG_CLOSE, nLine, nColumn, pos, tagName, false, foreignLevel!=-1);
					if (pos == foreignLevel)
					{	foreignLevel = -1;
					}
				}
				else
				{	// close the wanted tag
					yield new Token(text, TokenType.TAG_CLOSE, nLine, nColumn, pos, tagName, false, false);
					// reopen tags like <b>, <i>, <u>, etc.
					while (pos+1 < hierarchy.length)
					{	const t = hierarchy[pos+1];
						yield new Token(`<${t}>`, TokenType.FIX_STRUCTURE_TAG_OPEN, nLine, nColumn, pos, t, false, false);
						hierarchy[pos++] = t;
					}
					hierarchy.length = pos;
				}
			}
			countLines(text, 0, text.length);
			re = RE_TOKENIZER;
		}
		else
		{	// <name ...>
			const tagOpen = match[2];
			const attrs = match[3];
			let tagName = tagOpen.slice(1);
			if (foreignLevel!=-2 && tagName.indexOf('<')==-1)
			{	tagName = tagName.toLowerCase();
			}

			if (foreignLevel==-1 && (tagName=='svg' || tagName=='math'))
			{	foreignLevel = hierarchy.length;
			}

			yield new Token(tagOpen, TokenType.TAG_OPEN_BEGIN, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
			countLines(tagOpen, 0, tagOpen.length);

			if (attrs)
			{	curAttrs?.clear();
				// skip space in the beginning
				RE_SPACE.lastIndex = 0;
				RE_SPACE.test(attrs);
				let i = RE_SPACE.lastIndex; // RE_SPACE.lastIndex can change after yield
				let hasSpace = i > 0;
				if (hasSpace)
				{	const str = attrs.slice(0, i);
					yield new Token(str, TokenType.TAG_OPEN_SPACE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					countLines(str, 0, str.length);
				}
				while (true)
				{	// skip attribute name
					RE_ATTR_NAME.lastIndex = i;
					const m = RE_ATTR_NAME.exec(attrs); // RE_ATTR_NAME has 'g' flag, so can skip junk
					if (!m)
					{	if (i==attrs.length-1 && attrs.charCodeAt(i)==C_SLASH)
						{	nColumn++;
						}
						else if (i != attrs.length)
						{	const str = attrs.slice(i);
							yield new Token(str, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
							countLines(str, 0, str.length);
						}
						break;
					}
					const name = m[0];
					let nameLc = name;
					if (curAttrs && foreignLevel!=-2)
					{	nameLc = nameLc.toLowerCase();
					}
					if (i+name.length != RE_ATTR_NAME.lastIndex)
					{	// junk that RE_ATTR_NAME skipped
						const str = attrs.slice(i, RE_ATTR_NAME.lastIndex-name.length);
						i = RE_ATTR_NAME.lastIndex; // RE_ATTR_NAME.lastIndex can change after yield
						yield new Token(str, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						countLines(str, 0, str.length);
					}
					else
					{	i = RE_ATTR_NAME.lastIndex;
					}
					if (!hasSpace)
					{	yield new Token(' ', TokenType.FIX_STRUCTURE_TAG_OPEN_SPACE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					}
					const isDuplicateAttr = !!curAttrs?.has(nameLc);
					if (isDuplicateAttr)
					{	yield new Token(name, TokenType.JUNK_DUP_ATTR_NAME, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
					}
					else
					{	yield new Token(name, TokenType.ATTR_NAME, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
						curAttrs?.add(nameLc);
					}
					countLines(name, 0, name.length);
					// skip space
					RE_SPACE.lastIndex = i;
					RE_SPACE.test(attrs);
					hasSpace = RE_SPACE.lastIndex > i;
					if (hasSpace)
					{	const str = attrs.slice(i, RE_SPACE.lastIndex);
						i = RE_SPACE.lastIndex; // RE_SPACE.lastIndex can change after yield
						yield new Token(str, isDuplicateAttr ? TokenType.JUNK : TokenType.TAG_OPEN_SPACE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						countLines(str, 0, str.length);
					}
					else
					{	i = RE_SPACE.lastIndex;
					}
					// attribute has value?
					if (attrs.charCodeAt(i) == C_EQ)
					{	// skip '='
						const eqAt = i++;
						const eqAtLine = nLine;
						const eqAtColumn = nColumn++;
						// skip space
						RE_SPACE.lastIndex = i;
						RE_SPACE.test(attrs);
						let spaceToken: Token | undefined;
						if (RE_SPACE.lastIndex > i)
						{	const str = attrs.slice(i, RE_SPACE.lastIndex);
							spaceToken = new Token(str, TokenType.TAG_OPEN_SPACE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
						}
						i = RE_SPACE.lastIndex;
						// skip attribute value
						const qt = attrs.charCodeAt(i);
						const reValue = qt==C_QUOT ? RE_ATTR_VALUE_QUOT : qt==C_APOS ? RE_ATTR_VALUE_APOS : RE_ATTR_VALUE;
						reValue.lastIndex = i;
						if (reValue.test(attrs))
						{	const iAfterValue = reValue.lastIndex;
							if (!isDuplicateAttr)
							{	yield new Token('=', TokenType.ATTR_EQ, eqAtLine, eqAtColumn, hierarchy.length, '', false, foreignLevel!=-1);
								if (spaceToken)
								{	yield spaceToken;
									countLines(spaceToken.text, 0, spaceToken.text.length);
								}
								if (reValue == RE_ATTR_VALUE)
								{	const str = attrs.slice(i, iAfterValue);
									if (quoteAttributesMode == QuoteAttributesMode.QUOTE)
									{	yield new Token('"', TokenType.FIX_STRUCTURE_ATTR_QUOT, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
										yield new Token(str, TokenType.ATTR_VALUE, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
										yield new Token('"', TokenType.FIX_STRUCTURE_ATTR_QUOT, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
									}
									else
									{	yield new Token(str, TokenType.ATTR_VALUE, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
									}
									nColumn += str.length;
								}
								else
								{	let unquote = false;
									if (quoteAttributesMode == QuoteAttributesMode.UNQUOTE)
									{	unquote = true;
										// can unquote?
L:										for (let j=i+1, jEnd=iAfterValue-1; j<jEnd; j++)
										{	switch (attrs.charCodeAt(j))
											{	case C_SPACE:
												case C_TAB:
												case C_CR:
												case C_LF:
												case C_FORM_FEED:
												case C_QUOT:
												case C_APOS:
												case C_BACKTICK:
												case C_EQ:
												case C_LT:
												case C_GT:
												case C_AMP:
													unquote = false;
													break L;
											}
										}
									}
									if (!unquote)
									{	const str = attrs.slice(i, iAfterValue);
										yield new Token(str, TokenType.ATTR_VALUE, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
										nColumn++;
										countLines(str, 1, str.length-1);
										nColumn++;
									}
									else
									{	const str = attrs.slice(i+1, iAfterValue-1);
										const qtC = qt==C_QUOT ? '"' : "'";
										yield new Token(qtC, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
										nColumn++;
										yield new Token(str, TokenType.ATTR_VALUE, nLine, nColumn, hierarchy.length, tagName, false, foreignLevel!=-1);
										countLines(str, 0, str.length);
										yield new Token(qtC, TokenType.JUNK, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
										nColumn++;
									}
								}
							}
							else
							{	const str = attrs.slice(eqAt, iAfterValue);
								yield new Token(str, TokenType.JUNK, eqAtLine, eqAtColumn, hierarchy.length, '', false, foreignLevel!=-1);
								countLines(attrs, eqAt+1, iAfterValue);
							}
							i = iAfterValue;
						}
						else
						{	const str = attrs.slice(eqAt, attrs.charCodeAt(attrs.length-1)==C_SLASH ? -1 : attrs.length);
							yield new Token(str, TokenType.JUNK, eqAtLine, eqAtColumn, hierarchy.length, '', false, foreignLevel!=-1);
							countLines(attrs, eqAt+1, attrs.length);
							break; // syntax error
						}
						// skip space
						RE_SPACE.lastIndex = i;
						RE_SPACE.test(attrs);
						hasSpace = RE_SPACE.lastIndex > i;
						if (hasSpace)
						{	const str = attrs.slice(i, RE_SPACE.lastIndex);
							i = RE_SPACE.lastIndex; // RE_SPACE.lastIndex can change after yield
							yield new Token(str, TokenType.TAG_OPEN_SPACE, nLine, nColumn, hierarchy.length, '', false, foreignLevel!=-1);
							countLines(str, 0, str.length);
						}
						else
						{	i = RE_SPACE.lastIndex;
						}

					}
				}
			}

			if (foreignLevel == -1)
			{	const isSelfClosing = TAGS_VOID.has(tagName);

				if (attrs.charCodeAt(attrs.length - 1) != C_SLASH)
				{	yield new Token('>', TokenType.TAG_OPEN_END, nLine, nColumn, hierarchy.length, '', isSelfClosing, false);
				}
				else if (isSelfClosing)
				{	yield new Token('/>', TokenType.TAG_OPEN_END, nLine, nColumn-1, hierarchy.length, '', true, false);
				}
				else
				{	yield new Token('/', TokenType.JUNK, nLine, nColumn-1, hierarchy.length, '', false, false);
					yield new Token('>', TokenType.TAG_OPEN_END, nLine, nColumn, hierarchy.length, '', false, false);
				}

				if (!isSelfClosing)
				{	hierarchy[hierarchy.length] = tagName;
					if (tagName == 'script')
					{	re = RE_TOKENIZER_SCRIPT;
					}
					else if (tagName == 'style')
					{	re = RE_TOKENIZER_STYLE;
					}
					else if (tagName == 'textarea')
					{	re = RE_TOKENIZER_TEXTAREA;
					}
					else if (tagName == 'title')
					{	re = RE_TOKENIZER_TITLE;
					}
				}
			}
			else
			{	if (attrs.charCodeAt(attrs.length - 1) != C_SLASH)
				{	yield new Token('>', TokenType.TAG_OPEN_END, nLine, nColumn, hierarchy.length, '', false, true);
					hierarchy[hierarchy.length] = tagName;
				}
				else
				{	yield new Token('/>', TokenType.TAG_OPEN_END, nLine, nColumn-1, hierarchy.length, '', true, true);
					if (foreignLevel == hierarchy.length)
					{	foreignLevel = -1;
					}
				}
			}

			nColumn++;
		}
	}

	for (let pos=hierarchy.length-1; pos>=0; pos--)
	{	const t = hierarchy[pos];
		yield new Token(`</${t}>`, TokenType.FIX_STRUCTURE_TAG_CLOSE, nLine, nColumn, pos, t, false, foreignLevel!=-1);
	}
}

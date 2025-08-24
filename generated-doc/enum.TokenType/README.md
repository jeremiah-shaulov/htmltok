# `const` `enum` TokenType

[Documentation Index](../README.md)

```ts
import {TokenType} from "https://deno.land/x/htmltok@v3.0.0/mod.ts"
```

#### TEXT = <mark>0</mark>

> Text (character data). It doesn't contain entities and preprocessing instructions, as they are returned as separate tokens.



#### ENTITY = <mark>1</mark>

> One character reference, like `&apos;`, `&#39;` or `&#x27;`. This token also **can** contain preprocessing instructions in it's [Token.text](../class.Token/README.md#-text-string), like `&a<?...?>o<?...?>;`.



#### PI\_BEGIN = <mark>2</mark>

> The beginning of preprocessing instruction, i.e. `<?`.
> 
> After this token, 0 or more parts will be returned as [TokenType.PI\_MID](../enum.TokenType/README.md#pi_mid--3).
> Finally, the last part will be returned as [TokenType.PI\_END](../enum.TokenType/README.md#pi_end--4) with the value of `?>`.



#### PI\_MID = <mark>3</mark>

> Text inside preprocessing instruction.
> See [TokenType.PI\_BEGIN](../enum.TokenType/README.md#pi_begin--2).



#### PI\_END = <mark>4</mark>

> Preprocessing instruction end (`?>`).
> See [TokenType.PI\_BEGIN](../enum.TokenType/README.md#pi_begin--2).



#### COMMENT\_BEGIN = <mark>5</mark>

> The beginning of HTML comment, i.e. `<!--`.
> 
> After this token, 0 or more parts will be returned as [TokenType.COMMENT\_MID](../enum.TokenType/README.md#comment_mid--6) or [TokenType.COMMENT\_MID\_PI](../enum.TokenType/README.md#comment_mid_pi--7).
> [TokenType.COMMENT\_MID\_PI](../enum.TokenType/README.md#comment_mid_pi--7) means a preprocessing instruction inside the comment.
> Finally, the last part will be returned as [TokenType.COMMENT\_END](../enum.TokenType/README.md#comment_end--8) with the value of `-->`.



#### COMMENT\_MID = <mark>6</mark>

> Text inside comment.
> See [TokenType.COMMENT\_BEGIN](../enum.TokenType/README.md#comment_begin--5).



#### COMMENT\_MID\_PI = <mark>7</mark>

> If the comment contains preprocessing instructions, they are returned as this token type.
> See [TokenType.COMMENT\_BEGIN](../enum.TokenType/README.md#comment_begin--5).



#### COMMENT\_END = <mark>8</mark>

> Comment end (`-->`).
> See [TokenType.COMMENT\_BEGIN](../enum.TokenType/README.md#comment_begin--5).



#### CDATA\_BEGIN = <mark>9</mark>

> The beginning of CDATA block, i.e. `<![CDATA[`. It can occure in XML mode (`Settings.mode === 'xml'`), and in `svg` and `math` elements in HTML mode.
> In other places `<![CDATA[` is returned as [TokenType.JUNK](../enum.TokenType/README.md#junk--23).
> 
> After this token, 0 or more parts will be returned as [TokenType.CDATA\_MID](../enum.TokenType/README.md#cdata_mid--10) or [TokenType.CDATA\_MID\_PI](../enum.TokenType/README.md#cdata_mid_pi--11).
> [TokenType.CDATA\_MID\_PI](../enum.TokenType/README.md#cdata_mid_pi--11) means a preprocessing instruction inside the CDATA.
> Finally, the last part will be returned as [TokenType.CDATA\_END](../enum.TokenType/README.md#cdata_end--12) with the value of `]]>`.



#### CDATA\_MID = <mark>10</mark>

> Text inside CDATA.
> See [TokenType.CDATA\_BEGIN](../enum.TokenType/README.md#cdata_begin--9).



#### CDATA\_MID\_PI = <mark>11</mark>

> If the CDATA section contains preprocessing instructions, they are returned as this token type.
> See [TokenType.CDATA\_BEGIN](../enum.TokenType/README.md#cdata_begin--9).



#### CDATA\_END = <mark>12</mark>

> CDATA section end (`]]>`).
> See [TokenType.CDATA\_BEGIN](../enum.TokenType/README.md#cdata_begin--9).



#### DTD = <mark>13</mark>

> Document type declaration, like `<!...>`. It **can** contain preprocessing instructions.



#### TAG\_OPEN\_BEGIN = <mark>14</mark>

> `<` char followed by tag name, like `<script`. Tag name **can** contain preprocessing instructions, like `<sc<?...?>ip<?...?>`. [Token.tagName](../class.Token/README.md#-tagname-string) contains lowercased (if not XML and there're no preprocessing instructions) tag name.



#### TAG\_OPEN\_SPACE = <mark>15</mark>

> Any number of whitespace characters (can include newline chars) inside opening tag markup. It separates tag name and attributes, and can occure between attributes, and at the end of opening tag.



#### ATTR\_NAME = <mark>16</mark>

> Attribute name. It **can** contain preprocessing instructions, like `a<?...?>b<?...?>`. `Token.getValue()` returns lowercased (if not XML and there're no preprocessing instructions) attribute name.



#### ATTR\_EQ = <mark>17</mark>

> `=` char after attribute name. It's always followed by [TokenType.ATTR\_VALUE](../enum.TokenType/README.md#attr_value--18) (optionally preceded by [TokenType.TAG\_OPEN\_SPACE](../enum.TokenType/README.md#tag_open_space--15)). If `=` is not followed by attribute value, it's returned as [TokenType.JUNK](../enum.TokenType/README.md#junk--23).



#### ATTR\_VALUE = <mark>18</mark>

> Attribute value. It can be quoted in `"` or `'`, or it can be unquoted. This token type **can** contain entities and preprocessing instructions, like `"a<?...?>&lt;<?...?>"`. [Token.getValue()](../class.Token/README.md#-getvalue-string) returns unquoted text with decoded entities, but preprocessing instructions are left intact.



#### TAG\_OPEN\_END = <mark>19</mark>

> `>` or `/>` chars that terminate opening tag. [Token.isSelfClosing](../class.Token/README.md#-isselfclosing-boolean) indicates whether this tag doesn't have corresponding closing tag.



#### TAG\_CLOSE = <mark>20</mark>

> Closing tag token, like `</script >`. It **can** contain preprocessing instructions, like `</sc<?...?>ip<?...?>>`.



#### RAW\_LT = <mark>21</mark>

> `<` char, that is not part of markup (just appears in text). Typically you want to convert it to `&lt;`.



#### RAW\_AMP = <mark>22</mark>

> `&` char, that is not part of markup (just appears in text). Typically you want to convert it to `&amp;`.



#### JUNK = <mark>23</mark>

> Characters that are not in place. Typically you want to remove them. This token type can appear in the following situations:
> 
> - Characters in opening tag, that can't be interpreted as attributes. For example repeating `=` char, or `/` at the end of opening tag, which must have corresponding closing tag.
> - Unnecessary quotes around attribute value, if requested to unquote attributes.
> - Attribute values of duplicate attributes.
> - Closing tag, that was not opened.
> - CDATA not in XML or foreign tags.



#### JUNK\_DUP\_ATTR\_NAME = <mark>24</mark>

> Name of duplicate attribute.



#### FIX\_STRUCTURE\_TAG\_OPEN = <mark>25</mark>

> `FIX_STRUCTURE_*` token types don't represent text in source code, but are generated by the tokenizer to suggest markup fixes. `FIX_STRUCTURE_TAG_OPEN` is automatically inserted opening tag, like `<b>`. Token text cannot contain preprocessing instructions. Consider the following markup: `<b>BOLD<u>BOLD-UND</b>UND</u>` many browsers will interpret this as `<b>BOLD<u>BOLD-UND</u></b><u>UND</u>`. Also this tokenizer will suggest `</u>` as [TokenType.FIX\_STRUCTURE\_TAG\_CLOSE](../enum.TokenType/README.md#fix_structure_tag_close--28), and `<u>` as [TokenType.FIX\_STRUCTURE\_TAG\_OPEN](../enum.TokenType/README.md#fix_structure_tag_open--25).



#### FIX\_STRUCTURE\_TAG\_OPEN\_SPACE = <mark>26</mark>

> One space character that is suggested between attributes in situations like `<meta name="name"content="content">`.



#### FIX\_STRUCTURE\_TAG\_OPEN\_END = <mark>27</mark>

> Automatically inserted `>` character at the end of stream, if there is opening tag not closed.
> Then 0 or more [TokenType.FIX\_STRUCTURE\_TAG\_CLOSE](../enum.TokenType/README.md#fix_structure_tag_close--28) tokens can be generated to close all unclosed tags.



#### FIX\_STRUCTURE\_TAG\_CLOSE = <mark>28</mark>

> Autogenerated closing tag, like `</td>`. It's generated when closing tag is missing in the source markup.



#### FIX\_STRUCTURE\_ATTR\_QUOT = <mark>29</mark>

> One autogenerated quote character to surround attribute value, if `Settings.quoteAttributes` was requested, or when `Settings.mode === 'xml'`.



#### FIX\_STRUCTURE\_PI\_END = <mark>30</mark>

> If there was [TokenType.PI\_BEGIN](../enum.TokenType/README.md#pi_begin--2) generated, but then end of stream reached without terminating [TokenType.PI\_END](../enum.TokenType/README.md#pi_end--4),
> will generate this fix token with the value of `?>`.
> Also will generate it if a preprocessing instruction was opened and not closed inside a comment ([TokenType.COMMENT\_MID\_PI](../enum.TokenType/README.md#comment_mid_pi--7)) or a CDATA section ([TokenType.CDATA\_MID\_PI](../enum.TokenType/README.md#cdata_mid_pi--11)).



#### FIX\_STRUCTURE\_COMMENT\_END = <mark>31</mark>

> If there was [TokenType.COMMENT\_BEGIN](../enum.TokenType/README.md#comment_begin--5) generated, but then end of stream reached without terminating [TokenType.COMMENT\_END](../enum.TokenType/README.md#comment_end--8),
> will generate this fix token with the value of `-->`.



#### FIX\_STRUCTURE\_CDATA\_END = <mark>32</mark>

> If there was [TokenType.CDATA\_BEGIN](../enum.TokenType/README.md#cdata_begin--9) generated, but then end of stream reached without terminating [TokenType.CDATA\_END](../enum.TokenType/README.md#cdata_end--12),
> will generate this fix token with the value of `]]>`.



#### MORE\_REQUEST = <mark>33</mark>

> Before returning the last token found in the source string, [htmltok()](../function.htmltok/README.md) generates this meta-token.
> If then you call `it.next(more)` with a nonempty string argument, this string will be appended to the last token, and the tokenization will continue.




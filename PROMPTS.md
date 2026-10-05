# Prompts para gerar os sprites

O site já funciona sem imagens (os lutadores são desenhados em pixel art pelo código).
Se você quiser trocar pelos seus sprites, gere duas imagens e salve como:

- `src/img/sprites/lula.png`
- `src/img/sprites/flavio.png`

## Formato que o site espera

- **Tira horizontal** de quadros **quadrados** do mesmo tamanho (ex.: 4 quadros de 64×64 = imagem 256×64).
  O número de quadros é calculado por `largura ÷ altura`, então a imagem precisa ter exatamente N quadrados.
- Personagem **virado para a DIREITA** (o Flávio é espelhado automaticamente).
- Fundo **transparente** ou **magenta puro `#FF00FF`** (o site remove o magenta sozinho).
- Personagem de corpo inteiro, com os pés encostando na borda de baixo e as mãos juntas
  na borda direita, mais ou menos na metade da altura (é dali que sai a rajada).
- Sem rajada/energia desenhada: o raio é feito pelo código e muda de tamanho com os votos.

Geradores de imagem quase nunca acertam tamanho exato nem transparência. O caminho prático é
gerar grande, recortar os 4 quadros, reduzir cada um para 64×64 com *nearest neighbor*
(no GIMP: Imagem → Redimensionar → Interpolação "Nenhuma") e juntar lado a lado.

---

## Prompt 1: Lula

```
Pixel art sprite sheet, 16-bit SNES fighting game style (Street Fighter II / Dragon Ball Z
Super Butouden), 4 animation frames arranged in a single horizontal row, each frame a perfect
square of identical size, evenly spaced, no gaps, no borders, no text, no labels.

Character: caricature of an elderly Brazilian man, short white-gray hair, full short white
beard, rectangular dark glasses, warm tan skin, navy blue suit, white shirt, red tie, small red
star pin on the lapel. Friendly but determined expression.

Pose: full body, side view facing RIGHT, wide fighting stance (knees bent, one foot forward),
both arms stretched straight forward at chest height with palms together and open, like
firing a Kamehameha. The 4 frames show a subtle charging loop: slight body bob, hair and
jacket fluttering, hands trembling.

Constraints: feet touching the bottom edge of each frame, hands reaching the right edge of
the frame at mid-height, character centered horizontally otherwise. NO energy beam, NO aura,
NO effects, NO shadow on the floor. Flat solid magenta background (#FF00FF) filling all
empty space. Crisp pixels, limited palette, 1px dark outline, no anti-aliasing, no gradients.
```

## Prompt 2: Flávio Bolsonaro

```
Pixel art sprite sheet, 16-bit SNES fighting game style (Street Fighter II / Dragon Ball Z
Super Butouden), 4 animation frames arranged in a single horizontal row, each frame a perfect
square of identical size, evenly spaced, no gaps, no borders, no text, no labels.

Character: caricature of a Brazilian man in his mid-40s, short dark brown hair combed to the
side, clean-shaven, light skin, dark charcoal suit, white shirt, green tie with a thin yellow
stripe, small blue pin on the lapel. Serious, determined expression.

Pose: full body, side view facing RIGHT, wide fighting stance (knees bent, one foot forward),
both arms stretched straight forward at chest height with palms together and open, like
firing a Kamehameha. The 4 frames show a subtle charging loop: slight body bob, hair and
jacket fluttering, hands trembling.

Constraints: feet touching the bottom edge of each frame, hands reaching the right edge of
the frame at mid-height, character centered horizontally otherwise. NO energy beam, NO aura,
NO effects, NO shadow on the floor. Flat solid magenta background (#FF00FF) filling all
empty space. Crisp pixels, limited palette, 1px dark outline, no anti-aliasing, no gradients.
```

> Os dois prompts pedem o personagem virado para a direita de propósito. Se o gerador
> desenhar o Flávio virado para a esquerda, espelhe a imagem antes de salvar.

## Dicas se o resultado vier ruim

- Se os 4 quadros vierem com tamanhos diferentes, peça **um quadro por vez**
  ("single frame, one character, square canvas") e monte a tira você mesmo.
- Se o gerador insistir em colocar fundo de cenário, acrescente:
  `isolated character, game asset, sprite on chroma key magenta background`.
- Se o rosto não lembrar a pessoa, descreva mais os traços (formato do rosto, sobrancelhas,
  nariz) em vez de usar o nome: muitos geradores bloqueiam ou distorcem nomes de políticos.



```
curl -s -X GET http://localhost:3000/dlc?hashX=2560c39c2c4eb3af8a9f72eb3070470b2d32b18de9b986e35a78decd25a84612 \
-H "Content-Type: application/json"

```
curl -s -X POST http://localhost:3000/dlc \
-H "Content-Type: application/json" \
-d '{"eventName":"BTC_price_will_be_up_at_2022-03-03T01:40:17.384Z", "m":"No", "R":"e460a86763cc9bfed96696d0efa15491ed1f2ad8c46ed4f7ea9398f83e0c152d", "P": "ac83a93b89c1b0a1e3ca1cec06f17a7876cf502f9bd5614dfaae8f038d57826b", "invoice": "lntb1u1p3zqxuapp5wnkpryvd06zhd4nqp33342wjk7m7e0r8jg38gvys274s22n9xyjsdqqcqzpgxqyz5vqsp5q0xwvfmx0ytcl6smg55mrpn4nzdu2sn7j43ejmk4ggj0wqktdvxs9qyyssqr83mp8fpa0fxw65atyy5l8s2vzgykr7y35qw653ygjca9p2jtj8rgg7v0tqgvxqunrje3g2pl3h8js45czkelm0lcy2xyzkl2e3s2gsqn0x7tq"}'

```

```
curl -s -X PUT http://localhost:3000/dlc \
-H "Content-Type: application/json" \
-d '{"Ex":"c11c1efffe0dbc4967a32a32b47a7c5704393d757160d26f369a17bce36c0614b3e91bb51ad2dcf67844c358b362a8491888968cd9e07a223482690a3f4b3ceff5a6fadaaaade9e9514a2224a085032a19a54b4ca8654d9abe1766f3f09045182305a72acc5ec4042ed83d3a2d9cd0bda27c62315bbfebfac4fd734968872ccf8a39f0ef2a07f0dfc3640371440bf6b00321b104b493ee83a9f790f1a6bc02c39f", "s":"e460a86763cc9bfed96696d0efa15491ed1f2ad8c46ed4f7ea9398f83e0c152df474e28be42f8cf64c4753ceffc55221891f07037a8900592de93e77aba20632"}'

```

```
npx prisma migrate reset
npx prisma migrate dev --name init
prisma migrate dev --name added_job_title
```
#!/usr/bin/env python3
"""Servidor do Embate Eleitoral: arquivos estáticos, com HTTPS opcional.

- Não serve nada cujo caminho tenha uma parte começando com ponto (.git, .tools,
  .embate.conf...), para não expor o repositório na rede.
- Com --ca, entrega em /ca.crt o certificado PÚBLICO da CA local, para instalar nos
  clientes (ssl/instalar-ca.sh). A chave da CA nunca fica na pasta servida.
"""
import argparse
import functools
import http.server
import os
import ssl
import sys
import urllib.parse


class Handler(http.server.SimpleHTTPRequestHandler):
    ca = None

    def caminho_limpo(self):
        caminho = urllib.parse.urlsplit(self.path).path
        return urllib.parse.unquote(caminho)

    def send_head(self):
        caminho = self.caminho_limpo()
        if caminho == '/ca.crt' and self.ca:
            return super().send_head()
        if any(parte.startswith('.') for parte in caminho.split('/') if parte):
            self.send_error(404, 'File not found')
            return None
        return super().send_head()

    def translate_path(self, path):
        if self.ca and self.caminho_limpo() == '/ca.crt':
            return self.ca
        return super().translate_path(path)


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument('--porta', type=int, default=8000)
    p.add_argument('--dir', default=os.path.dirname(os.path.abspath(__file__)))
    p.add_argument('--cert', help='certificado do servidor (ativa HTTPS)')
    p.add_argument('--key', help='chave do certificado do servidor')
    p.add_argument('--ca', help='certificado público da CA, servido em /ca.crt')
    a = p.parse_args()
    if bool(a.cert) != bool(a.key):
        p.error('--cert e --key andam juntos')

    Handler.ca = a.ca
    srv = http.server.ThreadingHTTPServer(('', a.porta), functools.partial(Handler, directory=a.dir))
    if a.cert:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(a.cert, a.key)
        # Handshake na thread de cada conexão: um cliente lento não trava o accept().
        srv.socket = ctx.wrap_socket(srv.socket, server_side=True, do_handshake_on_connect=False)

    print(f'Servindo {a.dir} em {"https" if a.cert else "http"}://0.0.0.0:{a.porta}', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == '__main__':
    main()

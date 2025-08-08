from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

def create_test_pdf():
    # Criar um PDF simples com conteúdo de teste
    filename = "sample.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    
    # Adicionar conteúdo de texto
    c.drawString(100, 750, "Documento de Teste - MedSmart")
    c.drawString(100, 720, "Este é um documento PDF de teste para o sistema MedSmart.")
    c.drawString(100, 690, "")
    c.drawString(100, 660, "Conteúdo de Cardiologia:")
    c.drawString(100, 630, "- Anatomia do coração")
    c.drawString(100, 600, "- Fisiologia cardiovascular")
    c.drawString(100, 570, "- Patologias cardíacas")
    c.drawString(100, 540, "- Diagnóstico e tratamento")
    c.drawString(100, 510, "")
    c.drawString(100, 480, "Este documento contém informações básicas sobre")
    c.drawString(100, 450, "cardiologia para fins de teste do sistema.")
    
    c.save()
    print(f"PDF criado: {filename}")

if __name__ == "__main__":
    create_test_pdf()
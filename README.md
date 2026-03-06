# SupplementTracker 💊💧

SupplementTracker é um aplicativo móvel moderno e elegante desenvolvido em React Native com a plataforma Expo. Focado em ajudar usuários a manterem a consistência nas suas rotinas de saúde, o aplicativo gerencia inteligentemente o uso de suplementos e a hidratação diária, tudo embalado em uma belíssima e fluida interface "Liquid Glass".

## 🌟 Principais Funcionalidades

- **Autenticação Segura:** Login rápido e seguro utilizando Conta Google ou E-mail/Senha (mantido pelo Firebase Auth).
- **Rastreamento de Suplementos:** Adicione facilmente, edite e acompanhe seus suplementos diários.
- **Notificações e Lembretes:** Nunca mais esqueça de tomar seus suplementos! Alarmes customizáveis e locais avisam a hora correta.
- **Monitor de Hidratação Dinâmico:** Uma experiência visual interativa onde um "copo de água de vidro" vai se enchendo interativamente conforme você registra seu consumo (com detecção física de giroscópio!).
- **Modo Offline-First:** O aplicativo é projetado para carregar instantaneamente usando cache local (`AsyncStorage`) enquanto sincroniza as últimas informações em segundo plano com o `Firestore`.
- **Estatísticas e Ofensivas (Streaks):** Acompanhe as suas sequências de uso, observe seus hábitos a longo prazo em gráficos detalhados e desbloqueie **Conquistas/Medalhas** baseadas na sua dedicação!
- **Perfil Inteligente:** Recomendações de metas de água e objetivos calculados a partir de suas medidas (peso e altura).
- **UI "Liquid Glass":** Utilização profunda do efeito glassmorphism (vidro fosco translúcido), gradientes dinâmicos, feedback háptico, e micro-animações.

## 📱 Tecnologias Utilizadas

- **Framework principal:** [React Native](https://reactnative.dev/) com suporte [Expo](https://expo.dev/) (Managed Workflow)
- **Backend & Cloud:** [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Armazenamento Local:** `@react-native-async-storage/async-storage`
- **Animações e Gráficos:** `react-native-reanimated`, `react-native-svg`
- **Funcionalidades do Dispositivo:** `expo-notifications`, `expo-sensors`, `expo-haptics`, `expo-blur`, `@react-native-google-signin/google-signin`
- **Gestão de Rotas:** `react-navigation`

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- Node.js (versão 18+)
- [Conta ativa no Firebase](https://console.firebase.google.com) (Para configuração caso re-crie o backend)
- App _Expo Go_ instalado no seu dispositivo Android/iOS físico para testes.

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/gabrielndo/supplement-tracker.git
   cd supplement-tracker
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configuração do Firebase:**
   Para o aplicativo funcionar perfeitamente em modo de desenvolvimento próprio, certifique-se de que os arquivos de configuração (como o `google-services.json` contendo as credenciais de pacote para permissões do Google Auth) existam na raiz do projeto, e que as chaves em `src/services/firebase.js` sejam compatíveis com seu banco de dados Firebase.

4. **Inicie o servidor do Expo:**
   ```bash
   npx expo start -c
   ```

5. **Acesse no seu celular:**
   Escaneie o QR Code que aparecerá no terminal com o aplicativo **Expo Go** (para Android) ou câmera padrão (para iOS).

## 🔨 Gerando a Build para Produção (Android)

Devido aos requisitos de serviços nativos (Google Sign-In), em alguns casos a melhor opção para testar o App rodando "livre" de forma nativa fora do Expo Go será usar o EAS Build.

```bash
npm install -g eas-cli
eas login
eas build -p android --profile production
```

## 📜 Licença

Desenvolvido para uso pessoal e open-source. Caso decida forkar o projeto, sinta-se livre para adaptá-lo às suas necessidades.

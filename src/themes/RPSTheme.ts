import type { Theme } from './Theme';
import type { HandState, GestureType } from '../gestureEngine';

type RPSChoice = 'Rock' | 'Paper' | 'Scissors';

export class RPSTheme implements Theme {
  name = 'RockPaperScissors';
  
  private gameState: 'idle' | 'countdown' | 'result' = 'idle';
  private countdownValue = 3;
  private lastTick = 0;
  
  private playerChoice: RPSChoice | null = null;
  private aiChoice: RPSChoice | null = null;
  
  private playerScore = 0;
  private aiScore = 0;
  private resultMessage = '';

  private getRPSChoice(gesture: GestureType): RPSChoice | null {
    if (gesture === 'Fist') return 'Rock';
    if (gesture === 'OpenPalm') return 'Paper';
    if (gesture === 'Peace') return 'Scissors';
    return null;
  }

  private resolveWinner() {
    if (!this.playerChoice) {
       this.resultMessage = "I couldn't see your hand! Try again.";
       return;
    }
    
    const choices: RPSChoice[] = ['Rock', 'Paper', 'Scissors'];
    this.aiChoice = choices[Math.floor(Math.random() * 3)];
    
    if (this.playerChoice === this.aiChoice) {
       this.resultMessage = "It's a TIE! 😐";
    } else if (
       (this.playerChoice === 'Rock' && this.aiChoice === 'Scissors') ||
       (this.playerChoice === 'Paper' && this.aiChoice === 'Rock') ||
       (this.playerChoice === 'Scissors' && this.aiChoice === 'Paper')
    ) {
       this.resultMessage = "You WIN! 🎉";
       this.playerScore++;
       if (window && (window as any).triggerHaptic) (window as any).triggerHaptic();
    } else {
       this.resultMessage = "You LOSE! 😭";
       this.aiScore++;
    }
  }

  init() {}

  handleGesture(hand: HandState, ctx: CanvasRenderingContext2D, width: number, height: number, getX: (x: number) => number, getY: (y: number) => number, timestamp: number): void {
    const { currentGesture: gesture } = hand;
    
    // Check for "ThumbsUp" to start the game
    if (this.gameState === 'idle' || this.gameState === 'result') {
       if (gesture === 'ThumbsUp') {
          this.gameState = 'countdown';
          this.countdownValue = 3;
          this.lastTick = timestamp;
          this.playerChoice = null;
          this.aiChoice = null;
          this.resultMessage = '';
       }
    }
    
    // If we're right at the moment of result, capture the gesture!
    if (this.gameState === 'countdown' && this.countdownValue === 0) {
       this.playerChoice = this.getRPSChoice(gesture);
    }
  }

  update(width: number, height: number) {
    if (this.gameState === 'countdown') {
       const now = performance.now();
       if (now - this.lastTick > 1000) {
          this.countdownValue--;
          this.lastTick = now;
          
          if (this.countdownValue < 0) {
             this.gameState = 'result';
             this.resolveWinner();
          }
       }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    
    // HUD
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    
    ctx.fillText(`Player: ${this.playerScore}  |  AI: ${this.aiScore}`, width/2, 40);

    if (this.gameState === 'idle') {
       ctx.fillText("Make a 👍 Thumbs Up to Start!", width/2, height/2);
       ctx.font = '24px sans-serif';
       ctx.fillText("Valid moves: ✊ (Rock), 🖐️ (Paper), ✌️ (Scissors)", width/2, height/2 + 40);
    } 
    else if (this.gameState === 'countdown') {
       ctx.font = 'bold 120px sans-serif';
       const text = this.countdownValue > 0 ? this.countdownValue.toString() : 'SHOOT!';
       ctx.fillText(text, width/2, height/2);
    }
    else if (this.gameState === 'result') {
       ctx.font = 'bold 48px sans-serif';
       ctx.fillText(this.resultMessage, width/2, height/2 - 100);
       
       ctx.font = '80px sans-serif';
       
       const getEmoji = (c: RPSChoice | null) => {
         if (c === 'Rock') return '✊';
         if (c === 'Paper') return '🖐️';
         if (c === 'Scissors') return '✌️';
         return '❓';
       };
       
       ctx.fillText(`You: ${getEmoji(this.playerChoice)}`, width/4, height/2 + 20);
       ctx.fillText(`AI: ${getEmoji(this.aiChoice)}`, (width/4)*3, height/2 + 20);
       
       ctx.font = '24px sans-serif';
       ctx.fillText("Make a 👍 Thumbs Up to play again", width/2, height - 60);
    }
  }
}

// score-tracker.js - Sistema Híbrido de Puntuación

/**
 * Sistema de Tracking Automático de Puntuación
 * Calcula puntos basándose en tiempo de juego y acciones realizadas
 */
class GameScoreTracker {
	constructor(game) {
		this.game = game;
		this.startTime = Date.now();
		this.actionCount = 0;
		this.keyPresses = new Set();
		this.isActive = true;

		// Configuración por juego
		this.config = {
			doom: {
				actionKeys: ['Control', 'Space', 'Shift', '1', '2', '3', '4', '5', '6', '7'],
				timeMultiplier: 10, // puntos por segundo
				actionMultiplier: 5 // puntos por acción
			},
			wolf: {
				actionKeys: ['Control', 'Space', 'Shift', 'Alt'],
				timeMultiplier: 8,
				actionMultiplier: 6
			}
		};

		this.setupListeners();
	}

	setupListeners() {
		// Escuchar teclas de acción del juego
		this.keyHandler = (e) => {
			if (!this.isActive) return;

			const gameConfig = this.config[this.game];
			if (gameConfig && gameConfig.actionKeys.includes(e.key)) {
				this.actionCount++;
				this.keyPresses.add(e.key);
			}
		};

		document.addEventListener('keydown', this.keyHandler);
	}

	calculateScore() {
		const gameConfig = this.config[this.game];
		if (!gameConfig) return 0;

		const timeInSeconds = Math.floor((Date.now() - this.startTime) / 1000);

		// Fórmula: (tiempo * multiplicador) + (acciones * multiplicador)
		const timeScore = timeInSeconds * gameConfig.timeMultiplier;
		const actionScore = this.actionCount * gameConfig.actionMultiplier;
		const varietyBonus = this.keyPresses.size * 50; // Bonus por usar diferentes acciones

		return Math.max(0, timeScore + actionScore + varietyBonus);
	}

	getStats() {
		return {
			timePlayedSeconds: Math.floor((Date.now() - this.startTime) / 1000),
			actions: this.actionCount,
			score: this.calculateScore(),
			game: this.game
		};
	}

	stop() {
		this.isActive = false;
		if (this.keyHandler) {
			document.removeEventListener('keydown', this.keyHandler);
		}
	}

	destroy() {
		this.stop();
	}
}

/**
 * Sistema de Entrada Manual de Puntuación
 */
class ManualScoreEntry {
	static showScoreDialog(game, callback) {
		// Crear modal para introducir puntuación
		const modal = document.createElement('div');
		modal.id = 'score-modal';
		modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h2>🎮 Registrar Puntuación - ${game.toUpperCase()}</h2>
          <p>Introduce tu puntuación final del juego:</p>
          <!-- 🔴 CAMBIO CLAVE: Usamos type="text" para permitir la entrada del teclado -->
          <input type="text" id="manual-score" min="0" placeholder="0" pattern="[0-9]*" inputmode="numeric" />
          <div class="modal-buttons">
            <button onclick="window.submitManualScore()">✅ Guardar</button>
            <button onclick="window.closeScoreModal()">❌ Cancelar</button>
          </div>
          <p class="hint">💡 Consejo: Busca tu puntuación en la pantalla final del juego</p>
        </div>
      </div>
    `;

		document.body.appendChild(modal);

		const scoreInput = document.getElementById('manual-score');

		// 🟢 NUEVA LÓGICA: Filtrar entrada para asegurar que solo sean números
		const filterInput = (e) => {
			// Reemplaza cualquier carácter que NO sea un dígito (0-9)
			e.target.value = e.target.value.replace(/[^0-9]/g, '');
		};

		if (scoreInput) {
			scoreInput.addEventListener('input', filterInput);
		}

		// Enfocar el input
		setTimeout(() => {
			if (scoreInput) scoreInput.focus();
		}, 100);

		// Funciones globales para los botones
		window.submitManualScore = () => {
			// Asegurarse de quitar el listener antes de cerrar
			if (scoreInput) scoreInput.removeEventListener('input', filterInput);

			const score = parseInt(scoreInput?.value || '0') || 0;
			callback(score);
			window.closeScoreModal();
		};

		window.closeScoreModal = () => {
			// Asegurarse de quitar el listener antes de cerrar
			if (scoreInput) scoreInput.removeEventListener('input', filterInput);

			const modal = document.getElementById('score-modal');
			if (modal) modal.remove();
			// Limpiar funciones globales
			delete window.submitManualScore;
			delete window.closeScoreModal;
		};

		// Permitir guardar con Enter
		if (scoreInput) {
			scoreInput.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					window.submitManualScore();
				}
			});
		}
	}
}

/**
 * Sistema Híbrido: Combina tracking automático + entrada manual
 */
class HybridScoreSystem {
	constructor(game, dosInstance) {
		this.game = game;
		this.dos = dosInstance;
		this.tracker = new GameScoreTracker(game);
		console.log(`🎮 Sistema híbrido iniciado para ${game.toUpperCase()}`);
	}

	// Obtener puntuación automática basada en actividad
	getAutoScore() {
		return this.tracker.calculateScore();
	}

	// Permitir al usuario introducir puntuación manual
	async getManualScore() {
		return new Promise((resolve) => {
			ManualScoreEntry.showScoreDialog(this.game, (score) => {
				console.log(`📝 Puntuación manual introducida: ${score}`);
				resolve(score);
			});
		});
	}

	// Método principal: decidir entre automático o manual
	async getFinalScore() {
		const stats = this.tracker.getStats();

		console.log(`📊 Estadísticas de juego:`, stats);

		// Si jugó más de 2 minutos (120 segundos), usar score automático
		if (stats.timePlayedSeconds >= 120) {
			console.log(`⏱️ Tiempo suficiente (${stats.timePlayedSeconds}s) - Usando puntuación automática: ${stats.score}`);
			return stats.score;
		}

		// Si jugó poco tiempo, pedir puntuación manual
		console.log(`⏱️ Poco tiempo jugado (${stats.timePlayedSeconds}s) - Solicitando puntuación manual`);
		return await this.getManualScore();
	}

	destroy() {
		console.log(`🛑 Sistema híbrido detenido para ${this.game.toUpperCase()}`);
		this.tracker.destroy();
	}
}

// Hacer disponibles globalmente
window.GameScoreTracker = GameScoreTracker;
window.ManualScoreEntry = ManualScoreEntry;
window.HybridScoreSystem = HybridScoreSystem;

console.log('✅ Sistema híbrido de puntuación cargado');
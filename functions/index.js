const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Ініціалізація Firebase Admin SDK для доступу до сервісів
admin.initializeApp();

const db = admin.firestore();

/**
 * Ця функція спрацьовує кожного разу, коли оновлюється документ у колекції 'duels'.
 */
exports.checkDuelResult = functions.firestore
    .document("duels/{duelId}")
    .onUpdate(async (change, context) => {
        // Отримуємо дані документа до та після оновлення
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Перевіряємо, чи статус дуелі ще "в процесі"
        if (afterData.status !== "pending") {
            console.log("Duel already completed. Exiting function.");
            return null;
        }

        const results = afterData.results;
        const playerIds = Object.keys(results);

        const player1_id = playerIds[0];
        const player2_id = playerIds[1];

        const player1_result = results[player1_id];
        const player2_result = results[player2_id];

        // Перевіряємо, чи обидва гравці завершили тест (їхній результат більше не null)
        if (player1_result.score !== null && player2_result.score !== null) {
            console.log(`Both players finished duel ${context.params.duelId}. Determining winner.`);

            let winnerId = null;
            let loserId = null;

            // Визначаємо переможця: спочатку за балами, потім за часом
            if (player1_result.score > player2_result.score) {
                winnerId = player1_id;
                loserId = player2_id;
            } else if (player2_result.score > player1_result.score) {
                winnerId = player2_id;
                loserId = player1_id;
            } else { // Якщо рахунок однаковий, перевіряємо час
                if (player1_result.time < player2_result.time) {
                    winnerId = player1_id;
                    loserId = player2_id;
                } else if (player2_result.time < player1_result.time) {
                    winnerId = player2_id;
                    loserId = player1_id;
                }
            }

            // Оновлюємо статус дуелі на "завершено"
            await db.collection("duels").doc(context.params.duelId).update({
                status: "completed",
                winnerId: winnerId, // Можна зберегти ID переможця
            });

            console.log(`Winner is ${winnerId || "draw"}. Sending notifications.`);

            // Створюємо сповіщення для обох гравців
            if (winnerId && loserId) {
                // Сповіщення для переможця
                await createNotification(winnerId, {
                    type: "achievement",
                    title: "Zwycięstwo w pojedynku!",
                    body: `Pokonałeś ${results[loserId].nickname || "przeciwnika"} z wynikiem ${results[winnerId].score} do ${results[loserId].score}!`,
                    icon: "trophy",
                });
                // Сповіщення для того, хто програв
                await createNotification(loserId, {
                    type: "duel_request", // Можна використати іншу іконку
                    title: "Pojedynek zakończony",
                    body: `Uległeś w pojedynku z ${results[winnerId].nickname || "przeciwnikiem"} z wynikiem ${results[loserId].score} do ${results[winnerId].score}.`,
                    icon: "shield-outline",
                });
            } else {
                // Сповіщення про нічию
                const drawMessage = `Remis w pojedynku z wynikiem ${player1_result.score}:${player2_result.score}!`;
                await createNotification(player1_id, { type: "achievement", title: "Remis!", body: drawMessage, icon: "aperture-outline" });
                await createNotification(player2_id, { type: "achievement", title: "Remis!", body: drawMessage, icon: "aperture-outline" });
            }
        } else {
            console.log("Not all players have finished yet.");
        }
        return null;
    });

/**
 * Допоміжна функція для створення сповіщень (дублює логіку з вашого сервісу)
 * @param {string} userId - ID користувача, якому надіслати сповіщення.
 * @param {object} data - Дані сповіщення.
 */
async function createNotification(userId, data) {
    try {
        await db
            .collection("users")
            .doc(userId)
            .collection("notifications")
            .add({
                ...data,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
    } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
    }
}

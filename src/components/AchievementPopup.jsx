export default function AchievementPopup({ unlockedAchievements, onDismiss }) {
  if (!unlockedAchievements || !unlockedAchievements.length) return null;
  const achievement = unlockedAchievements[0];
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-[bounce_1s_ease-in-out]">
        {achievement.img ? (
          <img src={achievement.img} alt={achievement.title} className="w-24 h-24 mx-auto mb-4 rounded-xl shadow-md border-2 border-gray-100 object-cover" />
        ) : (
          <div className="text-6xl mb-4 drop-shadow-lg">{achievement.icon}</div>
        )}
        <h2 className="text-2xl font-black text-gray-900 mb-2">Meilenstein erreicht!</h2>
        <h3 className="text-lg font-bold text-purple-600 mb-4">{achievement.title}</h3>
        <p className="text-gray-600 font-medium mb-8 leading-relaxed">{achievement.text}</p>
        <button
          onClick={onDismiss}
          className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition transform hover:scale-105"
        >
          Genial!
        </button>
      </div>
    </div>
  );
}

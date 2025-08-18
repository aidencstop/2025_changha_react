export const getSelectedLeagueId = () => {
  const v = localStorage.getItem('selectedLeagueId');
  return v ? parseInt(v, 10) : null;
};
export const setSelectedLeagueId = (id) => {
  localStorage.setItem('selectedLeagueId', String(id));
};

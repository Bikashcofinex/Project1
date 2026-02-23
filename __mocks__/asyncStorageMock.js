const storage = {};

module.exports = {
  setItem: jest.fn(async (key, value) => {
    storage[key] = value;
  }),
  getItem: jest.fn(async key => (key in storage ? storage[key] : null)),
  removeItem: jest.fn(async key => {
    delete storage[key];
  }),
  clear: jest.fn(async () => {
    Object.keys(storage).forEach(key => delete storage[key]);
  }),
};

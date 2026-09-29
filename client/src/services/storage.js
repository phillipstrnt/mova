const TOKEN_KEY = "mova_token";
const USER_KEY = "mova_user";
const BUSINESS_KEY = "mova_business";
const BRANCH_KEY = "mova_branch";

export const storage = {
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser() {
    const user = localStorage.getItem(USER_KEY);

    try {
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  removeUser() {
    localStorage.removeItem(USER_KEY);
  },

  setBusiness(business) {
    localStorage.setItem(BUSINESS_KEY, JSON.stringify(business));
  },

  getBusiness() {
    const business = localStorage.getItem(BUSINESS_KEY);

    try {
      return business ? JSON.parse(business) : null;
    } catch {
      return null;
    }
  },

  removeBusiness() {
    localStorage.removeItem(BUSINESS_KEY);
  },

  setBranch(branch) {
    localStorage.setItem(BRANCH_KEY, JSON.stringify(branch));
  },

  getBranch() {
    const branch = localStorage.getItem(BRANCH_KEY);

    try {
      return branch ? JSON.parse(branch) : null;
    } catch {
      return null;
    }
  },

  removeBranch() {
    localStorage.removeItem(BRANCH_KEY);
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(BUSINESS_KEY);
    localStorage.removeItem(BRANCH_KEY);
  },
};
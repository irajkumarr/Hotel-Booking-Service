const { AppError } = require("../utils");
const { StatusCodes } = require("http-status-codes");

class CrudRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    const response = await this.model.create(data);
    return response;
  }

  async getAll() {
    const response = await this.model.findMany();
    return response;
  }

  async get(data) {
    const response = await this.model.findUnique({
      where: {
        id: data,
      },
    });
    if (!response) {
      throw new AppError(
        "Not able to find the resource",
        StatusCodes.NOT_FOUND
      );
    }
    return response;
  }

  async delete(data) {
    const response = await this.model.delete({
      where: {
        id: data,
      },
    });
    return response;
  }

  async update(id, data) {
    const response = await this.model.update({
      where: {
        id: id,
      },
      data: data,
    });
    return response;
  }
}

module.exports = CrudRepository;

import { UserModel} from "../database/models";

export default class User {
    public model: UserModel;

    constructor(model: UserModel) {
        this.model = model;
    }

    public static fromModel(user: UserModel): User | null | undefined {
        return new User(user);
    }

    public getDefaultingName(fallback?: string) {
        return this.getFullDefaultingName(fallback)?.split(" ")[0];
    }

    public getFullDefaultingName(fallback?: string) {
        return this.model.name ?? fallback;
    }
}
